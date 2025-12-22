const env = require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const moment = require('moment-timezone');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
// Serve static item images
app.use('/item_photos', express.static('item_photos'));


// Booqable API configuration
const BOOQABLE_API_KEY = process.env.BOOQABLE_API_KEY;
const BOOQABLE_API_URL = process.env.BOOQABLE_API_URL;

// Get upcoming orders for the next X days
// --- In-memory throttle for Booqable API ---
let lastBooqableFetch = 0;
let lastBooqableData = null;
const MIN_INTERVAL_MS = 10 * 1000; // 10 seconds (adjustable)

app.get('/api/orders', async (req, res) => {
  const now = Date.now();
  if (lastBooqableData && now - lastBooqableFetch < MIN_INTERVAL_MS) {
    const secondsLeft = Math.ceil((MIN_INTERVAL_MS - (now - lastBooqableFetch)) / 1000);
    return res.status(429).json({ 
      error: `Too many requests. Please wait ${secondsLeft} seconds before refreshing again.`,
      retryAfter: secondsLeft
    });
  }
  try {
    const startDate = moment().toISOString();
    const endDate = moment().add(7, 'days').toISOString();

    console.log('Using Booqable API Key:', BOOQABLE_API_KEY);

    // Switch to /api/4/orders/search POST endpoint for proper filtering
    const axiosConfig = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BOOQABLE_API_KEY}`,
      }
    };

    // Build filter body as per Booqable API docs
    const filterBody = {
      fields: {
        orders: "id"
      },
      filter: {
        conditions: {
          operator: "and",
          attributes: [
            {
              operator: "or",
              attributes: [
                {
                  starts_at: {
                    gte: startDate,
                    lte: endDate
                  }
                },
                {
                  stops_at: {
                    gte: startDate,
                    lte: endDate
                  }
                }
              ]
            },
            {
              operator: "and",
              attributes: [
                { deposit_type: "none" },
                { payment_status: "paid" }
              ]
            }
          ]
        }
      }
    };

    let orderIds = [];
    try {
      const ordersResponse = await axios.post(
        `${BOOQABLE_API_URL}/4/orders/search`,
        filterBody,
        axiosConfig
      );
      //fs.writeFileSync('booqable_api_response.json', JSON.stringify(ordersResponse.data, null, 2));
      if (Array.isArray(ordersResponse.data.data)) {
        orderIds = ordersResponse.data.data.map(o => o.id);
      } else {
        throw new Error('No data array in live Booqable API response');
      }
    } catch (err) {
      console.error('Failed to fetch order IDs from Booqable API:', err.message);
      return res.status(500).json({ error: 'Failed to fetch order IDs from Booqable API.' });
    }

    const fullOrders = [];
    for (const id of orderIds) {
      try {
        const orderDetailResp = await axios.get(
          `${BOOQABLE_API_URL}/4/orders/${id}?include=lines.item`,
          axiosConfig
        );
        if (orderDetailResp.data && orderDetailResp.data.data) {
          fullOrders.push({
            data: orderDetailResp.data.data,
            included: orderDetailResp.data.included || []
          });
        }
      } catch (err) {
        console.error(`Failed to fetch order ${id}:`, err.message);
      }
    }

    //this is for full inspection when we testin.
    //fs.writeFileSync('booqable_full_orders.json', JSON.stringify(fullOrders, null, 2));

    // Aggregate item counts by date and item name using relationships/lines and included
    // New structure: { [date]: [ { orderId, orderName, starts_at, stops_at, items: { itemName: { quantity, item_id } } }, ... ] }
    const itemCounts = {};
    // Only include orders whose starts_at is within the filter range (America/Vancouver)
    const filteredOrders = fullOrders.filter(order => {
      const attrs = order.data.attributes || {};
      if (!attrs.starts_at) return false;
      const orderStart = moment(attrs.starts_at).tz('America/Vancouver');
      const filterStart = moment(startDate).tz('America/Vancouver');
      const filterEnd = moment(endDate).tz('America/Vancouver');
      return orderStart.isSameOrAfter(filterStart) && orderStart.isSameOrBefore(filterEnd);
    });

    for (const order of filteredOrders) {
      const attrs = order.data.attributes || {};
      const orderDate = attrs.starts_at ? moment(attrs.starts_at).format('YYYY-MM-DD') : null;
      if (!orderDate || !order.data.relationships || !order.data.relationships.lines || !Array.isArray(order.data.relationships.lines.data)) continue;
      // Build lookup tables for included lines and products
      const included = order.included || [];
      const linesById = {};
      const productsById = {};
      for (const inc of included) {
        if (inc.type === 'lines') linesById[inc.id] = inc;
        if (inc.type === 'products') productsById[inc.id] = inc;
      }
      const items = {};
      for (const lineRef of order.data.relationships.lines.data) {
        const line = linesById[lineRef.id];
        if (!line || !line.attributes) continue;
        const lineAttrs = line.attributes;
        const itemName = lineAttrs.title;
        const quantity = lineAttrs.quantity;
        // Extract item_id from relationships if available
        let item_id = null;
        if (line.relationships && line.relationships.item && line.relationships.item.data) {
          item_id = line.relationships.item.data.id;
        }
        if (!itemName || typeof quantity !== 'number') continue;
        if (!items[itemName]) {
          items[itemName] = { quantity: 0, item_id };
        }
        items[itemName].quantity += quantity;
        // Always update item_id to the latest found (in case of duplicates)
        items[itemName].item_id = item_id;
      }
      // Add this order to the date's array
      if (!itemCounts[orderDate]) itemCounts[orderDate] = [];
      itemCounts[orderDate].push({
        orderId: order.data.id,
        orderName: attrs.name || attrs.reference || attrs.display_name || order.data.id,
        starts_at: attrs.starts_at,
        stops_at: attrs.stops_at,
        items
      });
    }
    //console.log('Aggregated itemCounts:', JSON.stringify(itemCounts, null, 2));

    lastBooqableData = itemCounts;
    lastBooqableFetch = Date.now();
    return res.json({ itemCounts });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
