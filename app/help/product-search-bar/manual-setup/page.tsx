"use client"

// Manual setup guide for product search bar - fixed version
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  WrenchIcon, 
  DownloadIcon, 
  CodeIcon, 
  CheckCircleIcon, 
  AlertCircleIcon,
  CopyIcon,
  FileTextIcon,
  CSSIcon,
  HTMLIcon,
  JavaScriptIcon
} from "@/components/icons"
import Link from "next/link"
import Image from "next/image"

export default function ProductSearchBarManualSetupPage() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const downloadJS = () => {
    const jsCode = `const fuseScript = document.createElement("script");
fuseScript.src = "https://cdn.jsdelivr.net/npm/fuse.js@6.6.2";
fuseScript.onload = () => {
  const init = () => {
	  
	  // 🔎 DEBUG: check if hidden products are available yet
    console.log("[TPR Search] Checking hidden list at startup..");
    console.log("Cards found:", document.querySelectorAll("#bq-hidden-list .booqable-product").length);


    // --- Normalize helper (lowercase, strip punctuation/whitespace) ---
    function normalize(str) {
      return str ? str.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() : "";
    }

    // --- Build Fuse.js index once products JSON is fetched ---
    fetch("/wp-content/uploads/products_with_tags.json")
      .then(res => res.json())
      .then(products => {
        console.log("[TPR Search] ✅ Search initialized with fuzzy search + tags");
        
        const fuse = new Fuse(products, {
          keys: [
            { name: "name", weight: 0.6 },
            { name: "tags", weight: 0.3 },
            { name: "description", weight: 0.1 }
          ],
          threshold: 0.3 // fuzziness sensitivity
        });

        const input = document.querySelector("#global-search");
        const resultsDiv = document.querySelector("#search-results");

        if (!input || !resultsDiv) {
          console.warn("[TPR Search] Missing #global-search or #search-results in DOM.");
          return;
        }

        let allResults = [];
        let currentPage = 1;
        const pageSize = 10;

        // --- Render results ---
        function renderResults() {
          if (!allResults.length) {
            resultsDiv.innerHTML = "";
            return;
          }

          const start = (currentPage - 1) * pageSize;
          const paginated = allResults.slice(start, start + pageSize);

          resultsDiv.innerHTML = paginated.map(r => {
            const slug = r.item.url.split("/").pop(); // fallback slug
            return \`
              <div class="result" 
                   data-product-name="\${r.item.name}" 
                   data-product-slug="\${slug}"
                   style="display:flex;align-items:center;margin-bottom:8px;cursor:pointer;">
                <img src="\${r.item.image}" alt="\${r.item.name}"
                     style="width:50px;height:50px;object-fit:cover;border-radius:4px;margin-right:10px;">
                <div style="font-size:16px;color:#333;text-decoration:none;">
                  \${r.item.name}
                </div>
              </div>
            \`;
          }).join("");

          // --- Pagination controls ---
          const totalPages = Math.ceil(allResults.length / pageSize);
          if (totalPages > 1) {
            resultsDiv.innerHTML += \`
              <div class="pagination" style="display:flex;justify-content:space-between;padding:8px 12px;border-top:1px solid #eee;">
                <button class="prev-page" \${currentPage === 1 ? "disabled" : ""}>‹ Prev</button>
                <span>Page \${currentPage} of \${totalPages}</span>
                <button class="next-page" \${currentPage === totalPages ? "disabled" : ""}>Next ›</button>
              </div>
            \`;

            resultsDiv.querySelector(".prev-page")?.addEventListener("click", () => {
              if (currentPage > 1) {
                currentPage--;
                renderResults();
              }
            });
            resultsDiv.querySelector(".next-page")?.addEventListener("click", () => {
              if (currentPage < totalPages) {
                currentPage++;
                renderResults();
              }
            });
          }

          // --- Attach click handlers to open modal ---
          resultsDiv.querySelectorAll(".result").forEach(div => {
            div.addEventListener("click", () => {
              const name = div.getAttribute("data-product-name");
              const slug = div.getAttribute("data-product-slug");
              console.log("[TPR Search] 🔍 Trying to open modal for:", name, \`(slug: \${slug})\`);

              const hiddenCards = document.querySelectorAll("#bq-hidden-list .booqable-product");
              let matched = false;

              // Normalize the search name for comparison
              const normalizedTarget = normalize(name);

              // --- First try exact name match ---
              hiddenCards.forEach(card => {
                const titleEl = card.querySelector(".bq-product-name");
                if (titleEl) {
                  const normalizedCard = normalize(titleEl.textContent);
                  if (normalizedCard === normalizedTarget) {
                    console.log("[TPR Search] ✅ Matched by name:", normalizedCard);
                    const clickTarget = card.querySelector(".booqable-product-inner") || card;
                    clickTarget.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
                    matched = true;
                  }
                }
              });

              // --- Fallback: try slug ---
              if (!matched && slug) {
                const normalizedSlug = normalize(slug.replace(/-/g, " "));
                hiddenCards.forEach(card => {
                  const titleEl = card.querySelector(".bq-product-name");
                  if (titleEl) {
                    const normalizedCard = normalize(titleEl.textContent);
                    if (normalizedCard === normalizedSlug) {
                      console.log("[TPR Search] ✅ Fallback matched by slug:", normalizedSlug);
                      const clickTarget = card.querySelector(".booqable-product-inner") || card;
                      clickTarget.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
                      matched = true;
                    }
                  }
                });
              }

              if (!matched) {
                console.warn("[TPR Search] ❌ No hidden card matched for:", name);
              }
            });
          });
        }

        // --- Input listener ---
        input.addEventListener("input", (e) => {
          const query = e.target.value.trim();
          if (!query) {
            resultsDiv.innerHTML = "";
            allResults = [];
            return;
          }
          allResults = fuse.search(query);
          currentPage = 1;
          renderResults();
        });

      });
  };
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", init);
} else {
	init();
}
};
document.head.appendChild(fuseScript);`

    const blob = new Blob([jsCode], { type: "text/javascript" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "product-search-bar.js"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const cssCode = `/* Experimental with custom booqable search */
.bq-hidden-list {
    position: fixed;
    left: -9999px;
    top: 0;
    width: 1px;
    height: 1px;
    overflow: hidden;
  }`

  const downloadCSS = () => {
    const blob = new Blob([cssCode], { type: "text/css" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "product-search-bar.css"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="border-b border-border bg-card px-8 py-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-pastel-mint flex items-center justify-center">
            <WrenchIcon className="h-6 w-6 text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">Product Search Bar - Manual Setup</h1>
            <p className="text-muted-foreground">
              Complete guide to manually installing the custom product search bar without the WordPress plugin
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Overview */}
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircleIcon className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-orange-700">Manual Setup Notice</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-orange-600">
                This guide covers manual installation of the custom product search bar. If you prefer a simpler setup, 
                consider using our WordPress plugin instead.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                What You'll Accomplish
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-pastel-mint text-pastel-mint-foreground rounded-full flex items-center justify-center text-xs font-medium">1</span>
                  <div>
                    <h4 className="font-medium">Install JavaScript Search Functionality</h4>
                    <p className="text-sm text-muted-foreground">Add fuzzy search capability with Fuse.js integration</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-pastel-mint text-pastel-mint-foreground rounded-full flex items-center justify-center text-xs font-medium">2</span>
                  <div>
                    <h4 className="font-medium">Configure CSS Styling</h4>
                    <p className="text-sm text-muted-foreground">Hide the product list and style search results</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-pastel-mint text-pastel-mint-foreground rounded-full flex items-center justify-center text-xs font-medium">3</span>
                  <div>
                    <h4 className="font-medium">Add HTML Search Elements</h4>
                    <p className="text-sm text-muted-foreground">Create the search input and results container</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-pastel-mint text-pastel-mint-foreground rounded-full flex items-center justify-center text-xs font-medium">4</span>
                  <div>
                    <h4 className="font-medium">Upload Product Data</h4>
                    <p className="text-sm text-muted-foreground">Place the products_with_tags.json file on your server</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prerequisites */}
          <Card>
            <CardHeader>
              <CardTitle>Prerequisites</CardTitle>
              <CardDescription>
                Before you begin, make sure you have the following ready
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Generated products_with_tags.json file from the Product Search Bar tool</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Access to your WordPress site's files or ability to add custom code</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Code Snippets plugin installed (recommended for WordPress)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step-by-step instructions */}
          <div className="space-y-8">
            {/* Step 1 */}
            <Card className="border-l-4 border-l-pastel-mint">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-8 h-8 bg-pastel-mint text-pastel-mint-foreground rounded-full flex items-center justify-center text-sm font-medium">1</span>
                  <JavaScriptIcon className="h-5 w-5" />
                  Step 1: Add JavaScript Search Functionality
                </CardTitle>
                <CardDescription>
                  Install the Fuse.js library and search functionality using a WordPress shortcode
                </CardDescription>
              </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-3">Using Code Snippets Plugin (Recommended)</h4>
                    <div className="space-y-4">
                      <div className="rounded-lg border bg-muted/40 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium">WordPress Shortcode</span>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => copyToClipboard('[tpr_product_search]')}>
                              <CopyIcon className="h-4 w-4 mr-1" />
                              Copy
                            </Button>
                          </div>
                        </div>
                        <pre className="text-xs bg-background p-3 rounded border overflow-x-auto">
                          <code>[tpr_product_search]</code>
                        </pre>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <h5 className="font-medium text-sm mb-2">Installation Steps:</h5>
                          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                            <li>Install and activate the "Code Snippets" plugin</li>
                            <li>Create a new snippet with the JavaScript code below</li>
                            <li>Add the shortcode to any page where you want the search bar</li>
                          </ol>
                        </div>
                        <div>
                          <Image
                            src="/images/help/code-snippet-manual-search-bar-addition (1).png"
                            alt="Code Snippets plugin interface"
                            width={300}
                            height={200}
                            className="rounded border"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">JavaScript Code</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Complete JavaScript implementation with Fuse.js integration
                        </span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => copyToClipboard(document.querySelector('pre code')?.textContent || '')}>
                            <CopyIcon className="h-4 w-4 mr-1" />
                            Copy
                          </Button>
                          <Button size="sm" onClick={downloadJS}>
                            <DownloadIcon className="h-4 w-4 mr-1" />
                            Download .js
                          </Button>
                        </div>
                      </div>
                      <pre className="text-xs bg-background p-4 rounded border overflow-x-auto max-h-96 overflow-y-auto">
                        <code>{`const fuseScript = document.createElement("script");
fuseScript.src = "https://cdn.jsdelivr.net/npm/fuse.js@6.6.2";
fuseScript.onload = () => {
  const init = () => {
	  
	  // 🔎 DEBUG: check if hidden products are available yet
    console.log("[TPR Search] Checking hidden list at startup..");
    console.log("Cards found:", document.querySelectorAll("#bq-hidden-list .booqable-product").length);


    // --- Normalize helper (lowercase, strip punctuation/whitespace) ---
    function normalize(str) {
      return str ? str.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() : "";
    }

    // --- Build Fuse.js index once products JSON is fetched ---
    fetch("/wp-content/uploads/products_with_tags.json")
      .then(res => res.json())
      .then(products => {
        console.log("[TPR Search] ✅ Search initialized with fuzzy search + tags");
        
        const fuse = new Fuse(products, {
          keys: [
            { name: "name", weight: 0.6 },
            { name: "tags", weight: 0.3 },
            { name: "description", weight: 0.1 }
          ],
          threshold: 0.3 // fuzziness sensitivity
        });

        const input = document.querySelector("#global-search");
        const resultsDiv = document.querySelector("#search-results");

        if (!input || !resultsDiv) {
          console.warn("[TPR Search] Missing #global-search or #search-results in DOM.");
          return;
        }

        let allResults = [];
        let currentPage = 1;
        const pageSize = 10;

        // --- Render results ---
        function renderResults() {
          if (!allResults.length) {
            resultsDiv.innerHTML = "";
            return;
          }

          const start = (currentPage - 1) * pageSize;
          const paginated = allResults.slice(start, start + pageSize);

          resultsDiv.innerHTML = paginated.map(r => {
            const slug = r.item.url.split("/").pop(); // fallback slug
            return \`
              <div class="result" 
                   data-product-name="\${r.item.name}" 
                   data-product-slug="\${slug}"
                   style="display:flex;align-items:center;margin-bottom:8px;cursor:pointer;">
                <img src="\${r.item.image}" alt="\${r.item.name}"
                     style="width:50px;height:50px;object-fit:cover;border-radius:4px;margin-right:10px;">
                <div style="font-size:16px;color:#333;text-decoration:none;">
                  \${r.item.name}
                </div>
              </div>
            \`;
          }).join("");

          // --- Pagination controls ---
          const totalPages = Math.ceil(allResults.length / pageSize);
          if (totalPages > 1) {
            resultsDiv.innerHTML += \`
              <div class="pagination" style="display:flex;justify-content:space-between;padding:8px 12px;border-top:1px solid #eee;">
                <button class="prev-page" \${currentPage === 1 ? "disabled" : ""}>‹ Prev</button>
                <span>Page \${currentPage} of \${totalPages}</span>
                <button class="next-page" \${currentPage === totalPages ? "disabled" : ""}>Next ›</button>
              </div>
            \`;

            resultsDiv.querySelector(".prev-page")?.addEventListener("click", () => {
              if (currentPage > 1) {
                currentPage--;
                renderResults();
              }
            });
            resultsDiv.querySelector(".next-page")?.addEventListener("click", () => {
              if (currentPage < totalPages) {
                currentPage++;
                renderResults();
              }
            });
          }

          // --- Attach click handlers to open modal ---
          resultsDiv.querySelectorAll(".result").forEach(div => {
            div.addEventListener("click", () => {
              const name = div.getAttribute("data-product-name");
              const slug = div.getAttribute("data-product-slug");
              console.log("[TPR Search] 🔍 Trying to open modal for:", name, \`(slug: \${slug})\`);

              const hiddenCards = document.querySelectorAll("#bq-hidden-list .booqable-product");
              let matched = false;

              // Normalize the search name for comparison
              const normalizedTarget = normalize(name);

              // --- First try exact name match ---
              hiddenCards.forEach(card => {
                const titleEl = card.querySelector(".bq-product-name");
                if (titleEl) {
                  const normalizedCard = normalize(titleEl.textContent);
                  if (normalizedCard === normalizedTarget) {
                    console.log("[TPR Search] ✅ Matched by name:", normalizedCard);
                    const clickTarget = card.querySelector(".booqable-product-inner") || card;
                    clickTarget.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
                    matched = true;
                  }
                }
              });

              // --- Fallback: try slug ---
              if (!matched && slug) {
                const normalizedSlug = normalize(slug.replace(/-/g, " "));
                hiddenCards.forEach(card => {
                  const titleEl = card.querySelector(".bq-product-name");
                  if (titleEl) {
                    const normalizedCard = normalize(titleEl.textContent);
                    if (normalizedCard === normalizedSlug) {
                      console.log("[TPR Search] ✅ Fallback matched by slug:", normalizedSlug);
                      const clickTarget = card.querySelector(".booqable-product-inner") || card;
                      clickTarget.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
                      matched = true;
                    }
                  }
                });
              }

              if (!matched) {
                console.warn("[TPR Search] ❌ No hidden card matched for:", name);
              }
            });
          });
        }

        // --- Input listener ---
        input.addEventListener("input", (e) => {
          const query = e.target.value.trim();
          if (!query) {
            resultsDiv.innerHTML = "";
            allResults = [];
            return;
          }
          allResults = fuse.search(query);
          currentPage = 1;
          renderResults();
        });

      });
  };
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", init);
} else {
	init();
}
};
document.head.appendChild(fuseScript);`}</code>
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>

            {/* Step 2 */}
            <Card className="border-l-4 border-l-pastel-lavender">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-8 h-8 bg-pastel-lavender text-pastel-lavender-foreground rounded-full flex items-center justify-center text-sm font-medium">2</span>
                  <CSSIcon className="h-5 w-5" />
                  Step 2: Add CSS Styling
                </CardTitle>
                <CardDescription>
                  Add CSS to hide the product list and style the search results properly
                </CardDescription>
              </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-3">CSS Code</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Required CSS for hiding the product list (combine with search bar CSS from Step 3)
                        </span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => copyToClipboard(cssCode)}>
                            <CopyIcon className="h-4 w-4 mr-1" />
                            Copy
                          </Button>
                          <Button size="sm" onClick={downloadCSS}>
                            <DownloadIcon className="h-4 w-4 mr-1" />
                            Download .css
                          </Button>
                        </div>
                      </div>
                      <pre className="text-xs bg-background p-4 rounded border overflow-x-auto">
                        <code>{cssCode}</code>
                      </pre>
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <p className="text-sm text-blue-700">
                          <strong>Note:</strong> This CSS hides the product list. You'll also need the search bar styling from Step 3 for a complete implementation.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Where to Add CSS</h4>
                    <div className="space-y-3">
                      <div className="p-4 rounded-lg bg-muted/40 border">
                        <h5 className="font-medium text-sm mb-2">Option 1: WordPress Customizer (Recommended)</h5>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                          <li>Go to Appearance → Customize → Additional CSS</li>
                          <li>Paste the CSS code and click "Publish"</li>
                        </ol>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/40 border">
                        <h5 className="font-medium text-sm mb-2">Option 2: Theme's style.css file</h5>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                          <li>Add to your theme's style.css file</li>
                          <li>Or create a child theme for better maintainability</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Image
                      src="/images/help/code-snippet-manual-search-bar-addition (2).png"
                      alt="WordPress Customizer Additional CSS section"
                      width={600}
                      height={300}
                      className="rounded border"
                    />
                  </div>
                </CardContent>
              </Card>

            {/* Step 3 */}
            <Card className="border-l-4 border-l-pastel-peach">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-8 h-8 bg-pastel-peach text-pastel-peach-foreground rounded-full flex items-center justify-center text-sm font-medium">3</span>
                  <HTMLIcon className="h-5 w-5" />
                  Step 3: Add HTML Search Elements
                </CardTitle>
                <CardDescription>
                  Add the search input and results container to your pages
                </CardDescription>
              </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-3">HTML Structure</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Required HTML elements for the search functionality
                        </span>
                        <Button size="sm" variant="outline" onClick={() => copyToClipboard(`<div class="tpr-header-row">
  <div class="rental-breadcrumb-container">
    <a href="/special-event-rentals/" class="breadcrumb-link">Categories</a> /
  </div>

  <!-- 🔍 Search Bar -->
  <div class="tpr-search-container">
    <input 
      type="text" 
      id="global-search" 
      placeholder="Search all rentals..." 
      autocomplete="off"
    />
    <div id="search-results" class="tpr-search-results"></div>
  </div>
</div>
<div id="bq-hidden-list">
  <!-- Your existing Booqable product list goes here -->
</div>`)}>
                          <CopyIcon className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <pre className="text-xs bg-background p-4 rounded border overflow-x-auto">
                        <code>{`<div class="tpr-header-row">
  <div class="rental-breadcrumb-container">
    <a href="/special-event-rentals/" class="breadcrumb-link">Categories</a> /
  </div>

  <!-- 🔍 Search Bar -->
  <div class="tpr-search-container">
    <input 
      type="text" 
      id="global-search" 
      placeholder="Search all rentals..." 
      autocomplete="off"
    />
    <div id="search-results" class="tpr-search-results"></div>
  </div>
</div>
<div id="bq-hidden-list">
  <!-- Your existing Booqable product list goes here -->
</div>`}</code>
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">CSS Styling</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Complete CSS for the search bar layout and styling
                        </span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => copyToClipboard(`/* HEADER ROW + LAYOUT */
.tpr-header-row {
  display: flex;
  flex-direction: column; /* stack vertically by default (mobile-first) */
  align-items: flex-start;
  max-width: 1200px;
  margin: 0 auto;
  padding: 10px 20px;
  gap: 10px; /* space between breadcrumb + search */
}

/* Breadcrumb styling */
.rental-breadcrumb-container {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  line-height: 1.2;
}

.rental-breadcrumb-container .breadcrumb-link {
  text-decoration: none;
  margin-right: 4px;
}

.rental-breadcrumb-container .breadcrumb-link:hover {
  text-decoration: underline;
}

/* Search container */
.tpr-search-container {
  width: 100%;          /* full width on mobile */
  max-width: 500px;     /* but don't get huge */
  margin: 0 auto;       /* center horizontally */
  position: relative;
}

/* --- DESKTOP: switch to grid, keep breadcrumb left + search centered --- */
@media (min-width: 1024px) {
  .tpr-header-row {
    display: grid;
    grid-template-columns: 1fr minmax(0, 500px) 1fr;
    align-items: end;
    padding: 10px 20px;
    gap: 0; /* reset mobile gap */
  }

  .tpr-header-row .rental-breadcrumb-container {
    grid-column: 1;
    justify-self: start;
    margin-bottom: 2px;
  }

  .tpr-header-row .tpr-search-container {
    grid-column: 2;
    justify-self: center;
    margin: 0;
  }
}

/* Input Styling */
.tpr-search-container input {
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 30px;
  outline: none;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0,0,0,0.05);
}

.tpr-search-container input:focus {
  border-color: #c8a46d; /* gold accent */
  box-shadow: 0 4px 12px rgba(200,164,109,0.25);
}

/* Results Dropdown */
.tpr-search-results {
  position: absolute;
  top: 110%;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.1);
  overflow: hidden;
  z-index: 9999;
}

/* Each Result */
.tpr-search-results .result {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.tpr-search-results .result:hover {
  background: #fdf7ef;
}

/* Result Image */
.tpr-search-results .result img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 6px;
  margin-right: 12px;
  flex-shrink: 0;
  border: 1px solid #eee;
}

/* Result Name */
.tpr-search-results .result div {
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

/* Pagination */
.tpr-search-results .pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding: 14px 0;
  border-top: 1px solid #eee;
  background: #fafafa;
}

/* Base button style */
.tpr-search-results .pagination-controls button {
  border: 1px solid #ddd;
  background: #fff;
  color: #333;
  padding: 8px 16px;
  border-radius: 999px; /* pill shape */
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0,0,0,0.06);
  transition: all 0.2s ease;
}

/* Hover state */
.tpr-search-results .pagination-controls button:hover:not(:disabled) {
  background: #fdf7ef;
  border-color: #c8a46d;
  color: #c8a46d;
  box-shadow: 0 3px 6px rgba(200,164,109,0.2);
}

/* Active/current page */
.tpr-search-results .pagination-controls button.active {
  background: #c8a46d;
  color: #fff;
  border-color: #c8a46d;
  box-shadow: 0 3px 6px rgba(200,164,109,0.25);
  cursor: default;
}

/* Disabled */
.tpr-search-results .pagination-controls button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}`)}>
                            <CopyIcon className="h-4 w-4 mr-1" />
                            Copy CSS
                          </Button>
                          <Button size="sm" onClick={() => {
                            const cssCode = `/* HEADER ROW + LAYOUT */
.tpr-header-row {
  display: flex;
  flex-direction: column; /* stack vertically by default (mobile-first) */
  align-items: flex-start;
  max-width: 1200px;
  margin: 0 auto;
  padding: 10px 20px;
  gap: 10px; /* space between breadcrumb + search */
}

/* Breadcrumb styling */
.rental-breadcrumb-container {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  line-height: 1.2;
}

.rental-breadcrumb-container .breadcrumb-link {
  text-decoration: none;
  margin-right: 4px;
}

.rental-breadcrumb-container .breadcrumb-link:hover {
  text-decoration: underline;
}

/* Search container */
.tpr-search-container {
  width: 100%;          /* full width on mobile */
  max-width: 500px;     /* but don't get huge */
  margin: 0 auto;       /* center horizontally */
  position: relative;
}

/* --- DESKTOP: switch to grid, keep breadcrumb left + search centered --- */
@media (min-width: 1024px) {
  .tpr-header-row {
    display: grid;
    grid-template-columns: 1fr minmax(0, 500px) 1fr;
    align-items: end;
    padding: 10px 20px;
    gap: 0; /* reset mobile gap */
  }

  .tpr-header-row .rental-breadcrumb-container {
    grid-column: 1;
    justify-self: start;
    margin-bottom: 2px;
  }

  .tpr-header-row .tpr-search-container {
    grid-column: 2;
    justify-self: center;
    margin: 0;
  }
}

/* Input Styling */
.tpr-search-container input {
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 30px;
  outline: none;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0,0,0,0.05);
}

.tpr-search-container input:focus {
  border-color: #c8a46d; /* gold accent */
  box-shadow: 0 4px 12px rgba(200,164,109,0.25);
}

/* Results Dropdown */
.tpr-search-results {
  position: absolute;
  top: 110%;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.1);
  overflow: hidden;
  z-index: 9999;
}

/* Each Result */
.tpr-search-results .result {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.tpr-search-results .result:hover {
  background: #fdf7ef;
}

/* Result Image */
.tpr-search-results .result img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 6px;
  margin-right: 12px;
  flex-shrink: 0;
  border: 1px solid #eee;
}

/* Result Name */
.tpr-search-results .result div {
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

/* Pagination */
.tpr-search-results .pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding: 14px 0;
  border-top: 1px solid #eee;
  background: #fafafa;
}

/* Base button style */
.tpr-search-results .pagination-controls button {
  border: 1px solid #ddd;
  background: #fff;
  color: #333;
  padding: 8px 16px;
  border-radius: 999px; /* pill shape */
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0,0,0,0.06);
  transition: all 0.2s ease;
}

/* Hover state */
.tpr-search-results .pagination-controls button:hover:not(:disabled) {
  background: #fdf7ef;
  border-color: #c8a46d;
  color: #c8a46d;
  box-shadow: 0 3px 6px rgba(200,164,109,0.2);
}

/* Active/current page */
.tpr-search-results .pagination-controls button.active {
  background: #c8a46d;
  color: #fff;
  border-color: #c8a46d;
  box-shadow: 0 3px 6px rgba(200,164,109,0.25);
  cursor: default;
}

/* Disabled */
.tpr-search-results .pagination-controls button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}`;
                            const blob = new Blob([cssCode], { type: "text/css" })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement("a")
                            a.href = url
                            a.download = "tpr-search-bar.css"
                            document.body.appendChild(a)
                            a.click()
                            document.body.removeChild(a)
                            URL.revokeObjectURL(url)
                          }}>
                            <DownloadIcon className="h-4 w-4 mr-1" />
                            Download CSS
                          </Button>
                        </div>
                      </div>
                      <pre className="text-xs bg-background p-4 rounded border overflow-x-auto max-h-96 overflow-y-auto">
                        <code>{`/* HEADER ROW + LAYOUT */
.tpr-header-row {
  display: flex;
  flex-direction: column; /* stack vertically by default (mobile-first) */
  align-items: flex-start;
  max-width: 1200px;
  margin: 0 auto;
  padding: 10px 20px;
  gap: 10px; /* space between breadcrumb + search */
}

/* Breadcrumb styling */
.rental-breadcrumb-container {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  line-height: 1.2;
}

.rental-breadcrumb-container .breadcrumb-link {
  text-decoration: none;
  margin-right: 4px;
}

.rental-breadcrumb-container .breadcrumb-link:hover {
  text-decoration: underline;
}

/* Search container */
.tpr-search-container {
  width: 100%;          /* full width on mobile */
  max-width: 500px;     /* but don't get huge */
  margin: 0 auto;       /* center horizontally */
  position: relative;
}

/* --- DESKTOP: switch to grid, keep breadcrumb left + search centered --- */
@media (min-width: 1024px) {
  .tpr-header-row {
    display: grid;
    grid-template-columns: 1fr minmax(0, 500px) 1fr;
    align-items: end;
    padding: 10px 20px;
    gap: 0; /* reset mobile gap */
  }

  .tpr-header-row .rental-breadcrumb-container {
    grid-column: 1;
    justify-self: start;
    margin-bottom: 2px;
  }

  .tpr-header-row .tpr-search-container {
    grid-column: 2;
    justify-self: center;
    margin: 0;
  }
}

/* Input Styling */
.tpr-search-container input {
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 30px;
  outline: none;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0,0,0,0.05);
}

.tpr-search-container input:focus {
  border-color: #c8a46d; /* gold accent */
  box-shadow: 0 4px 12px rgba(200,164,109,0.25);
}

/* Results Dropdown */
.tpr-search-results {
  position: absolute;
  top: 110%;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.1);
  overflow: hidden;
  z-index: 9999;
}

/* Each Result */
.tpr-search-results .result {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.tpr-search-results .result:hover {
  background: #fdf7ef;
}

/* Result Image */
.tpr-search-results .result img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 6px;
  margin-right: 12px;
  flex-shrink: 0;
  border: 1px solid #eee;
}

/* Result Name */
.tpr-search-results .result div {
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

/* Pagination */
.tpr-search-results .pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding: 14px 0;
  border-top: 1px solid #eee;
  background: #fafafa;
}

/* Base button style */
.tpr-search-results .pagination-controls button {
  border: 1px solid #ddd;
  background: #fff;
  color: #333;
  padding: 8px 16px;
  border-radius: 999px; /* pill shape */
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0,0,0,0.06);
  transition: all 0.2s ease;
}

/* Hover state */
.tpr-search-results .pagination-controls button:hover:not(:disabled) {
  background: #fdf7ef;
  border-color: #c8a46d;
  color: #c8a46d;
  box-shadow: 0 3px 6px rgba(200,164,109,0.2);
}

/* Active/current page */
.tpr-search-results .pagination-controls button.active {
  background: #c8a46d;
  color: #fff;
  border-color: #c8a46d;
  box-shadow: 0 3px 6px rgba(200,164,109,0.25);
  cursor: default;
}

/* Disabled */
.tpr-search-results .pagination-controls button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}`}</code>
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Implementation Options</h4>
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-muted/40 border">
                        <h5 className="font-medium text-sm mb-2">Option 1: Page Builder</h5>
                        <p className="text-sm text-muted-foreground">
                          Add the HTML elements using your page builder's custom HTML block
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/40 border">
                        <h5 className="font-medium text-sm mb-2">Option 2: Theme Template</h5>
                        <p className="text-sm text-muted-foreground">
                          Add directly to your theme template files (header.php, page templates, etc.)
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/40 border">
                        <h5 className="font-medium text-sm mb-2">Option 3: Shortcode</h5>
                        <p className="text-sm text-muted-foreground">
                          Create a shortcode that outputs the HTML structure
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

            {/* Step 4 */}
            <Card className="border-l-4 border-l-pastel-mint">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-8 h-8 bg-pastel-mint text-pastel-mint-foreground rounded-full flex items-center justify-center text-sm font-medium">4</span>
                  <FileTextIcon className="h-5 w-5" />
                  Step 4: Upload Product Data
                </CardTitle>
                <CardDescription>
                  Upload the products_with_tags.json file to your server
                </CardDescription>
              </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-3">Upload Location</h4>
                    <div className="space-y-4">
                      <Card className="border-orange-200 bg-orange-50/50">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2">
                            <AlertCircleIcon className="h-4 w-4 text-orange-600" />
                            <p className="text-sm text-orange-700">
                              The JavaScript code expects the file at <code className="bg-orange-100 px-1 rounded">/wp-content/uploads/products_with_tags.json</code>
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="p-4 rounded-lg bg-muted/40 border">
                        <h5 className="font-medium text-sm mb-2">File Location Details</h5>
                        <p className="text-sm text-muted-foreground mb-3">
                          The <code>products_with_tags.json</code> file must be uploaded to your WordPress uploads folder:
                        </p>
                        <div className="bg-background p-3 rounded border font-mono text-xs mb-3">
                          /wp-content/uploads/products_with_tags.json
                        </div>
                        <p className="text-sm text-muted-foreground">
                          This is the same location where WordPress stores your media files (images, documents, etc.).
                        </p>
                      </div>

                      <div className="p-4 rounded-lg bg-muted/40 border">
                        <h5 className="font-medium text-sm mb-2">Visual Guide</h5>
                        <p className="text-sm text-muted-foreground mb-3">
                          Here's what the file structure looks like in cPanel:
                        </p>
                        <Image
                          src="/images/help/Product-with-tags-save-location.png"
                          alt="cPanel file system showing wp-content/uploads folder location"
                          width={600}
                          height={400}
                          className="rounded border"
                        />
                        <p className="text-sm text-muted-foreground mt-3">
                          Need help? Contact our support team at <a href="mailto:contact@halfinthebox.com" className="text-blue-600 hover:text-blue-800">contact@halfinthebox.com</a>
                        </p>
                      </div>

                      <div className="p-4 rounded-lg bg-muted/40 border">
                        <h5 className="font-medium text-sm mb-2">Using WordPress Media Library</h5>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                          <li>Go to Media → Add New</li>
                          <li>Upload the products_with_tags.json file</li>
                          <li>Copy the file URL from the media library</li>
                          <li>Update the JavaScript fetch URL if needed</li>
                        </ol>
                      </div>

                      <div className="p-4 rounded-lg bg-muted/40 border">
                        <h5 className="font-medium text-sm mb-2">Using FTP/File Manager</h5>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                          <li>Upload to wp-content/uploads/ directory</li>
                          <li>Ensure file permissions allow web access</li>
                          <li>Test by visiting the file URL in browser</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Testing the Installation</h4>
                    <div className="space-y-3">
                      <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                        <h5 className="font-medium text-sm text-green-700 mb-2">✅ Success Indicators</h5>
                        <ul className="text-sm text-green-600 space-y-1">
                          <li>• Search input appears on the page</li>
                          <li>• Console shows "[TPR Search] ✅ Search initialized"</li>
                          <li>• Typing in search shows results</li>
                          <li>• Clicking results opens Booqable product modal</li>
                        </ul>
                      </div>
                      <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                        <h5 className="font-medium text-sm text-red-700 mb-2">❌ Common Issues</h5>
                        <ul className="text-sm text-red-600 space-y-1">
                          <li>• Check browser console for errors</li>
                          <li>• Verify products_with_tags.json is accessible</li>
                          <li>• Ensure HTML elements have correct IDs</li>
                          <li>• Check for JavaScript conflicts</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
          </div>

          {/* Next Steps */}
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle>Next Steps & Maintenance</CardTitle>
              <CardDescription>
                Keep your search functionality up to date and performing well
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 rounded-lg bg-background border">
                  <h3 className="font-medium text-sm mb-2">🔄 Regular Updates</h3>
                  <p className="text-xs text-muted-foreground">
                    Re-generate the products_with_tags.json file whenever you add new products or update existing ones
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-background border">
                  <h3 className="font-medium text-sm mb-2">📊 Performance Monitoring</h3>
                  <p className="text-xs text-muted-foreground">
                    Monitor search performance and consider adjusting the Fuse.js threshold for your specific needs
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Link href="/dashboard/product-search-bar">
                  <Button variant="outline">
                    Back to Generator
                  </Button>
                </Link>
                <Link href="/help">
                  <Button variant="outline">
                    Help Center
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
