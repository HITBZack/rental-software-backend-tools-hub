// Modern Order Picking Helper with Tailwind UI
(function() {
    'use strict';
    
    // Global variables
    let lastItemCounts = null;
    // Use localStorage for persistent picked state
    let pickedItems = new Set(JSON.parse(localStorage.getItem('pickedItems') || '[]'));
    let itemPhotoMap = {};
    let modal = null;
    
    // DOM elements
    const ordersList = document.getElementById('ordersList');
    const loadingElement = document.querySelector('.loading');
    const refreshBtn = document.getElementById('refreshOrdersBtn');
    const filterButton = document.getElementById('filterButton');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const lastFetchedText = document.getElementById('lastFetchedText');
    // Controls container for filter/sort/combined view
    let filterModesDiv = null;
    let combineButton = null;
    let unsortButton = null;
    let unpickBtn = null;
    
    // Initialize date inputs
    function initializeDateInputs() {
        const today = new Date();
        const nextTenDays = new Date();
        nextTenDays.setDate(today.getDate() + 10);
        
        startDateInput.value = today.toISOString().split('T')[0];
        endDateInput.value = nextTenDays.toISOString().split('T')[0];
    }

    // --- Modal for full image view ---
    function createModal() {
        if (modal) return;
        modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 hidden';
        modal.innerHTML = '<img id="modalImg" class="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl">';
        document.body.appendChild(modal);
        modal.addEventListener('click', () => { modal.classList.add('hidden'); });
        window.showModalImg = function(src) {
            modal.querySelector('#modalImg').src = src;
            modal.classList.remove('hidden');
        };
    }
    
    // Cache management
    // Use shared order-cache.js for caching
    function saveCache(data) {
        if (window.saveOrderCache) window.saveOrderCache(data);
    }
    function restoreCache() {
        if (window.loadOrderCache) {
            const cached = window.loadOrderCache();
            const cacheTime = window.getOrderCacheTime ? window.getOrderCacheTime() : null;
            if (cacheTime) updateLastFetchedText(cacheTime);
            return cached;
        }
        return null;
    }
    
    function updateLastFetchedText(timestamp) {
        if (!lastFetchedText || !timestamp) return;
        const date = new Date(timestamp);
        lastFetchedText.textContent = `Last fetched: ${date.toLocaleTimeString()}`;
    }
    
    // Picked items management (localStorage)
    function savePickedState() {
        try {
            localStorage.setItem('pickedItems', JSON.stringify([...pickedItems]));
        } catch (e) {
            console.warn('Could not save picked state:', e);
        }
    }
    function restorePickedState() {
        try {
            const saved = localStorage.getItem('pickedItems');
            if (saved) {
                pickedItems = new Set(JSON.parse(saved));
            }
        } catch (e) {
            console.warn('Could not restore picked state:', e);
        }
    }
    
    // Main display function
    function displayAggregatedItems(itemCounts) {
        if (!itemPhotoMapLoaded) {
            // Wait and retry until itemPhotoMap is loaded
            setTimeout(() => displayAggregatedItems(itemCounts), 50);
            return;
        }
        ordersList.innerHTML = '';
        if (!itemCounts || Object.keys(itemCounts).length === 0) {
            ordersList.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="text-gray-500 text-lg">No orders found for the selected date range</div>
                </div>
            `;
        }
        
        // Function to format date range
        function formatDateTime(dt) {
            if (!dt) return '';
            const d = new Date(dt);
            return d.toLocaleString('en-US', {
                year: 'numeric', month: 'short', day: '2-digit',
                hour: '2-digit', minute: '2-digit', hour12: true
            }).replace(', ', ', ').replace('AM', 'a.m.').replace('PM', 'p.m.');
        }
        
        // Flatten all orders, group by local YYYY-MM-DD of their starts_at date
        const flattenedOrders = {};
        Object.values(itemCounts).forEach(orderArray => {
            orderArray.forEach(order => {
                const date = new Date(order.starts_at);
                const localDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
                if (!flattenedOrders[localDate]) flattenedOrders[localDate] = [];
                flattenedOrders[localDate].push(order);
            });
        });

        // Sort date groups ascending
        const sortedDates = Object.keys(flattenedOrders).sort();

        // Render one date header per group, then all order cards for that date
        sortedDates.forEach(date => {
            const orders = flattenedOrders[date];
            if (orders.length === 0) return;


            // Sort orders within each group by starts_at ascending
            const sortedOrders = orders.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));

            sortedOrders.forEach(order => {
                const orderCard = document.createElement('div');
                orderCard.className = 'order-card';

                // Create order header
                const orderHeader = document.createElement('div');
                orderHeader.className = 'order-header flex justify-between items-center mb-2';

                let dateRange = '';
                if (order.starts_at) dateRange += formatDateTime(order.starts_at);
                if (order.stops_at) dateRange += ' → ' + formatDateTime(order.stops_at);
                orderHeader.innerHTML = `
                    <div>
                        <div class="order-dates font-medium text-pastel-brown">${dateRange}</div>
                    </div>
                `;
                orderCard.appendChild(orderHeader);

                // Create items container
                const itemsContainer = document.createElement('div');
                itemsContainer.className = 'space-y-2';

                Object.entries(order.items).forEach(([itemName, itemData]) => {
                    const itemRow = document.createElement('div');
                    itemRow.className = 'item-row group';
                    const pickedKey = `${order.orderId}-${itemData.item_id}`;
                    const isChecked = pickedItems.has(pickedKey);

                    // Left side: image, checkbox, label
                    const leftDiv = document.createElement('div');
                    leftDiv.className = 'flex items-center space-x-3 flex-1';

                    // Image
                    const imgSrc = itemPhotoMap[itemData.item_id];
                    if (imgSrc) {
                        const img = document.createElement('img');
                        img.src = imgSrc;
                        img.className = 'item-thumb w-12 h-12 object-cover rounded-lg shadow cursor-pointer mr-2';
                        img.title = 'Click to enlarge';
                        img.addEventListener('click', function(e) {
                            e.stopPropagation();
                            window.showModalImg && window.showModalImg(imgSrc);
                        });
                        leftDiv.appendChild(img);
                    }

                    // Checkbox
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.className = 'pick-checkbox';
                    checkbox.setAttribute('data-item-id', itemData.item_id);
                    checkbox.setAttribute('data-order-id', order.orderId);
                    if (isChecked) checkbox.checked = true;
                    leftDiv.appendChild(checkbox);

                    // Label
                    const label = document.createElement('span');
                    label.className = `item-name flex-1 ${isChecked ? 'line-through text-gray-500' : ''}`;
                    label.textContent = itemName;
                    leftDiv.appendChild(label);

                    // Right side: quantity
                    const rightDiv = document.createElement('div');
                    rightDiv.className = 'flex items-center space-x-2';
                    const qty = document.createElement('span');
                    qty.className = 'item-quantity';
                    qty.textContent = itemData.quantity;
                    rightDiv.appendChild(qty);

                    // Compose row
                    itemRow.appendChild(leftDiv);
                    itemRow.appendChild(rightDiv);

                    // Make row clickable to toggle checkbox, except on image or checkbox
                    itemRow.addEventListener('click', function(e) {
                        if (e.target.classList.contains('item-thumb') || e.target.classList.contains('pick-checkbox')) return;
                        checkbox.checked = !checkbox.checked;
                        checkbox.dispatchEvent(new Event('change'));
                    });

                    if (isChecked) itemRow.classList.add('bg-green-50');
                    itemsContainer.appendChild(itemRow);
                });

                orderCard.appendChild(itemsContainer);
                ordersList.appendChild(orderCard);
            });
        });

        // Attach event listeners to checkboxes
        document.querySelectorAll('.pick-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const itemId = this.dataset.itemId;
                const orderId = this.dataset.orderId;
                const isChecked = this.checked;
                const itemRow = this.closest('.item-row');
                const itemName = itemRow.querySelector('.item-name');
                const pickedKey = `${orderId}-${itemId}`;

                if (isChecked) {
                    pickedItems.add(pickedKey);
                    itemName.classList.add('line-through', 'text-gray-500');
                    itemRow.classList.add('bg-green-50');
                } else {
                    pickedItems.delete(pickedKey);
                    itemName.classList.remove('line-through', 'text-gray-500');
                    itemRow.classList.remove('bg-green-50');
                }

                savePickedState();
            });
        });

        // Hide loading state
        if (loadingElement) {
            loadingElement.classList.add('hidden');
        }
    }

    // Combined view logic
    function showCombinedView() {
        if (!lastItemCounts) return;
        // Aggregate all items across all days
        const combined = {};
        Object.values(lastItemCounts).forEach(orderArray => {
            orderArray.forEach(order => {
                Object.entries(order.items || {}).forEach(([itemName, itemObj]) => {
                    if (!combined[itemName]) combined[itemName] = { quantity: 0, item_id: itemObj.item_id };
                    combined[itemName].quantity += itemObj.quantity;
                    combined[itemName].item_id = itemObj.item_id;
                });
            });
        });
        // Display as a single combined card
        ordersList.innerHTML = '';
        const combinedSection = document.createElement('div');
        combinedSection.className = 'order-card';
        // Add a header for combined view with date range if available
        let allDates = Object.keys(lastItemCounts || {});
        let minDate = allDates.length ? new Date(Math.min(...allDates.map(d => new Date(d)))) : null;
        let maxDate = allDates.length ? new Date(Math.max(...allDates.map(d => new Date(d)))) : null;
        function formatDateTimeShort(dt) {
            if (!dt) return '';
            const d = new Date(dt);
            return d.toLocaleString('en-US', {
                year: 'numeric', month: 'short', day: '2-digit',
                hour: '2-digit', minute: '2-digit', hour12: true
            }).replace(', ', ', ').replace('AM', 'a.m.').replace('PM', 'p.m.');
        }
        let combinedRange = '';
        if (minDate && maxDate) combinedRange = `${formatDateTimeShort(minDate)} → ${formatDateTimeShort(maxDate)}`;
        combinedSection.innerHTML = `<div class="order-header mb-2"><div class="order-name font-bold">All Days Combined</div><div class="order-dates font-medium text-pastel-brown">${combinedRange}</div></div>`;
        let combinedEntries = Object.entries(combined);
        if (document.getElementById('sortQtyRadio') && document.getElementById('sortQtyRadio').checked) {
            combinedEntries = combinedEntries.sort((a, b) => b[1].quantity - a[1].quantity);
        }
        const filterTerms = ["E-TRANSFER", "PAID BY", "DELIVERY", "Address", "Payment", "Vendor Discount"];
        combinedEntries = combinedEntries.filter(([itemName, itemObj]) => {
            const lowerName = itemName.toLowerCase();
            return !filterTerms.some(term => lowerName.includes(term.toLowerCase()));
        });
        combinedEntries.forEach(([itemName, itemObj]) => {
            const item_id = itemObj.item_id;
            const quantity = itemObj.quantity;
            const pickedKey = String(item_id);
            const isPicked = pickedItems.has(pickedKey);
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'pick-checkbox accent-pastel-green w-5 h-5 mr-2';
            checkbox.checked = isPicked;
            checkbox.setAttribute('data-itemid', item_id);
            checkbox.title = 'Mark as Picked';
            checkbox.addEventListener('change', function() {
                if (this.checked) {
                    pickedItems.add(pickedKey);
                    itemDiv.classList.add('bg-pastel-green/30');
                } else {
                    pickedItems.delete(pickedKey);
                    itemDiv.classList.remove('bg-pastel-green/30');
                }
                savePickedState();
            });
            // Item thumbnail
            let imgElem = null;
            // Use the same structure as per-day view
            // Left side: image, checkbox, label
            const leftDiv = document.createElement('div');
            leftDiv.className = 'flex items-center space-x-3 flex-1';
            const imgSrc = item_id && itemPhotoMap[item_id] ? itemPhotoMap[item_id] : null;
            if (imgSrc) {
                const img = document.createElement('img');
                img.src = imgSrc;
                img.className = 'item-thumb w-12 h-12 object-cover rounded-lg shadow cursor-pointer mr-2';
                img.title = 'Click to enlarge';
                img.addEventListener('click', function(e) {
                    e.stopPropagation();
                    window.showModalImg && window.showModalImg(imgSrc);
                });
                leftDiv.appendChild(img);
            }
            // Checkbox
            const combinedCheckbox = document.createElement('input');
            combinedCheckbox.type = 'checkbox';
            combinedCheckbox.className = 'pick-checkbox';
            combinedCheckbox.setAttribute('data-item-id', item_id);
            combinedCheckbox.setAttribute('data-order-id', 'combined');
            if (isPicked) combinedCheckbox.checked = true;
            leftDiv.appendChild(combinedCheckbox);
            // Label
            const label = document.createElement('span');
            label.className = `item-name flex-1 ${isPicked ? 'line-through text-gray-500' : ''}`;
            label.textContent = itemName;
            leftDiv.appendChild(label);
            // Right side: quantity
            const rightDiv = document.createElement('div');
            rightDiv.className = 'flex items-center space-x-2';
            const qty = document.createElement('span');
            qty.className = 'item-quantity';
            qty.textContent = quantity;
            rightDiv.appendChild(qty);
            // Compose row
            const itemRow = document.createElement('div');
            itemRow.className = 'item-row group';
            itemRow.appendChild(leftDiv);
            itemRow.appendChild(rightDiv);
            // Make row clickable to toggle checkbox, except on image or checkbox
            itemRow.addEventListener('click', function(e) {
                if (e.target.classList.contains('item-thumb') || e.target.classList.contains('pick-checkbox')) return;
                combinedCheckbox.checked = !combinedCheckbox.checked;
                combinedCheckbox.dispatchEvent(new Event('change'));
            });
            if (isPicked) itemRow.classList.add('bg-green-50');
            combinedSection.appendChild(itemRow);
        });
        if (loadingElement) loadingElement.classList.add('hidden');
        ordersList.appendChild(combinedSection);
        // Toggle controls
        if (combineButton) combineButton.classList.add('hidden');
        if (unsortButton) unsortButton.classList.remove('hidden');
    }

    // Fetch orders from API
    async function fetchOrders() {
        if (loadingElement) loadingElement.classList.remove('hidden');
        try {
            ordersList.innerHTML = '';

            const response = await fetch('/api/orders');
            if (response.status === 429) {
                const data = await response.json();
                let waitMsg = data && data.retryAfter ? `<br><span class="text-pastel-brown text-lg font-medium">Please wait <strong>${data.retryAfter} seconds</strong> before refreshing again.</span>` : '';
                ordersList.innerHTML = `<div class="error-message">${data.error || 'Too many requests.'}${waitMsg}</div>`;
                
                // Disable refresh button with countdown
                if (refreshBtn && data.retryAfter) {
                    refreshBtn.disabled = true;
                    refreshBtn.innerHTML = `
                        <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Wait (${data.retryAfter}s)
                    `;
                    
                    let left = data.retryAfter;
                    const interval = setInterval(() => {
                        left--;
                        if (left > 0) {
                            refreshBtn.innerHTML = `
                                <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Wait (${left}s)
                            `;
                        } else {
                            refreshBtn.disabled = false;
                            refreshBtn.innerHTML = `
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                </svg>
                                Refresh Orders
                            `;
                            clearInterval(interval);
                        }
                    }, 1000);
                }
                
                if (loadingElement) {
                    loadingElement.classList.add('hidden');
                }
                return;
            }
            
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }
            
            lastItemCounts = data.itemCounts;
            displayAggregatedItems(data.itemCounts);
            saveCache(data.itemCounts);
            updateLastFetchedText(Date.now());
            
        } catch (error) {
            console.error('Error fetching orders:', error);
            ordersList.innerHTML = `<div class="error-message">Failed to load orders: ${error.message}</div>`;
        } finally {
            if (loadingElement) {
                loadingElement.classList.add('hidden');
            }
        }
    }
    
    // Filter existing data
    function filterOrders() {
        if (!lastItemCounts) return;
        
        const startDate = new Date(startDateInput.value);
        const endDate = new Date(endDateInput.value);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            displayAggregatedItems(lastItemCounts);
            return;
        }
        
        const filtered = {};
        Object.entries(lastItemCounts).forEach(([date, orders]) => {
            const orderDate = new Date(date);
            if (orderDate >= startDate && orderDate <= endDate) {
                filtered[date] = orders;
            }
        });
        
        displayAggregatedItems(filtered);
    }
    
    // Initialize the application
    function init() {
        initializeDateInputs();
        restorePickedState();
        createModal();
        // Load item photo map (async)
        window.itemPhotoMapLoaded = false;
        fetch('../item_photos_map.json').then(r => r.json()).then(map => {
            itemPhotoMap = map;
            window.itemPhotoMapLoaded = true;
        });

        // --- Wire up static HTML controls only, no DOM injection ---
        // Get references to static controls
        combineButton = document.getElementById('combineButton');
        unsortButton = document.getElementById('unsortButton');
        const sortQtyRadio = document.getElementById('sortQtyRadio');
        const filterBtn = document.getElementById('filterButton');
        const unpickBtn = document.getElementById('unpickAllBtn');
        // No dynamic creation of these controls! Only attach listeners and set initial state.
        // (Existing event logic for these controls should remain below)
        // Shrink refresh button for visual consistency
        if (refreshBtn) {
            refreshBtn.className = 'inline-flex items-center px-4 py-2 bg-pastel-green text-white font-medium rounded-md hover:bg-pastel-brown hover:shadow-lg transition-all duration-200 transform hover:scale-105 text-base';
            const icon = refreshBtn.querySelector('svg');
            if (icon) { icon.classList.remove('w-4','h-4','mr-2'); icon.classList.add('w-3','h-3','mr-1'); }
            refreshBtn.style.fontSize = '0.92rem';
        }

        // Restore cached data if present
        const cachedData = restoreCache();
        if (cachedData) {
            lastItemCounts = cachedData;
            if (loadingElement) loadingElement.classList.add('hidden');
            displayAggregatedItems(cachedData);
        } else {
            fetchOrders(); // Auto-refresh orders if no cached data is found
        }

        // Event listeners
        if (refreshBtn) refreshBtn.addEventListener('click', fetchOrders);
        if (filterButton) filterButton.addEventListener('click', filterOrders);
        sortQtyRadio.addEventListener('change', () => {
            if (unsortButton.classList.contains('hidden')) {
                displayAggregatedItems(lastItemCounts);
            } else {
                combineButton.click();
            }
        });
        // Combine All Days
        if (combineButton) {
            combineButton.addEventListener('click', function() {
                combineButton.classList.add('hidden');
                unsortButton.classList.remove('hidden');
                showCombinedView();
            });
        }

        // Unsort (Return to Per-Day View)
        if (unsortButton) {
            unsortButton.addEventListener('click', function() {
                combineButton.classList.remove('hidden');
                unsortButton.classList.add('hidden');
                displayAggregatedItems(lastItemCounts);
            });
        }
        // On page load, ensure only Combine is visible
        if (combineButton && unsortButton) {
            combineButton.classList.remove('hidden');
            unsortButton.classList.add('hidden');
        }
        unpickBtn.addEventListener('click', () => {
            pickedItems.clear();
            savePickedState();
            document.querySelectorAll('.pick-checkbox').forEach(cb => { cb.checked = false; });
            document.querySelectorAll('.date-item').forEach(item => { item.classList.remove('bg-pastel-green/30'); });
        });

        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mobileMenuDropdown = document.getElementById('mobileMenuDropdown');
        if (mobileMenuBtn && mobileMenuDropdown) {
            mobileMenuBtn.addEventListener('click', function(e) {
                const expanded = mobileMenuDropdown.classList.toggle('hidden') ? 'false' : 'true';
                mobileMenuBtn.setAttribute('aria-expanded', expanded);
            });
            // Close dropdown on link click
            mobileMenuDropdown.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    mobileMenuDropdown.classList.add('hidden');
                    mobileMenuBtn.setAttribute('aria-expanded', 'false');
                });
            });
            // Close dropdown on outside click
            document.addEventListener('click', (event) => {
                if (!mobileMenuDropdown.classList.contains('hidden')) {
                    if (!mobileMenuDropdown.contains(event.target) && !mobileMenuBtn.contains(event.target)) {
                        mobileMenuDropdown.classList.add('hidden');
                        mobileMenuBtn.setAttribute('aria-expanded', 'false');
                    }
                }
            });
        }
    }
    
    // Start the application when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();