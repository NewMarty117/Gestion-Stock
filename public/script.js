const socket = io();

// DOM Elements
const productsContainer = document.getElementById('productsContainer');
const searchInput = document.getElementById('searchInput');
const productModal = document.getElementById('productModal');
const modalProductName = document.getElementById('modalProductName');
const currentQuantitySpan = document.getElementById('currentQuantity');
const manualQuantityInput = document.getElementById('manualQuantity');
const syncIndicator = document.getElementById('syncIndicator');

// App state
let allProducts = [];
let filteredProducts = [];
let currentProductId = null;

// --- Socket.IO Listeners ---
socket.on('stock update', (products) => {
    allProducts = products.map(p => ({ ...p, image: getProductImage(p.id) }));
    filterProducts();
    showSyncIndicator();
});

// --- Rendering ---
function renderProducts() {
    productsContainer.innerHTML = '';
    filteredProducts.forEach(product => {
        const status = product.stock === 0 ? 'Rupture' : 
                      product.stock <= 5 ? 'Stock faible' : 'Disponible';
        const statusColor = product.stock === 0 ? 'red' : 
                           product.stock <= 5 ? 'yellow' : 'green';
        
        const productCard = document.createElement('div');
        productCard.className = 'product-card rounded-2xl p-6 fade-in cursor-pointer';
        productCard.onclick = () => openModal(product.id);
        
        productCard.innerHTML = `
            <div class="flex items-start justify-between">
                <div class="flex items-start space-x-4">
                    <div class="text-5xl">${product.image}</div>
                    <div class="flex-1">
                        <h3 class="font-semibold text-lg text-gray-900 mb-1">${product.name}</h3>
                        <p class="text-3xl font-bold text-gray-900 mb-2">${product.stock}</p>
                        <span class="status-badge ${statusColor === 'red' ? 'bg-red-50 text-red-700' : 
                                                      statusColor === 'yellow' ? 'bg-yellow-50 text-yellow-700' : 
                                                      'bg-green-50 text-green-700'}">
                            ${status}
                        </span>
                    </div>
                </div>
                <button class="text-gray-400 hover:text-gray-600">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        `;
        
        productsContainer.appendChild(productCard);
    });
}

// --- Modal --- 
function openModal(productId) {
    currentProductId = productId;
    const product = allProducts.find(p => p.id === productId);
    
    document.getElementById('modalProductName').textContent = product.name;
    
    productModal.classList.remove('hidden');
}

function closeModal() {
    productModal.classList.add('hidden');
    document.getElementById('addStockInput').value = '';
    document.getElementById('removeStockInput').value = '';
    currentProductId = null;
}

function handleStockChange(positive) {
    const inputId = positive ? 'addStockInput' : 'removeStockInput';
    const input = document.getElementById(inputId);
    const change = parseInt(input.value, 10);

    if (!isNaN(change) && change > 0) {
        const finalChange = positive ? change : -change;
        socket.emit('update stock', { id: currentProductId, change: finalChange });
        closeModal();
    }
}

// --- Search & Filter ---
function filterProducts() {
    const searchTerm = searchInput.value.toLowerCase();
    filteredProducts = allProducts.filter(p => 
        p.name.toLowerCase().includes(searchTerm)
    );
    renderProducts();
}

// --- Helpers ---
function getProductImage(productId) {
    const images = {
        viennoise_nature: "🥖",
        viennoise_chocolat: "🥖",
        viennoise_mois: "🥖",
        viennoise_pavot: "🥖",
        pain_de_mie: "🍞",
        burgers: "🍔",
        boule_brioche: "🥯",
        brioche_tressee: "🥨"
    };
    return images[productId] || "❓";
}

function showSyncIndicator() {
    syncIndicator.classList.remove('hidden');
    setTimeout(() => syncIndicator.classList.add('hidden'), 2000);
}

// --- Event Listeners ---
searchInput.addEventListener('input', filterProducts);
document.getElementById('addStockBtn').addEventListener('click', () => handleStockChange(true));
document.getElementById('removeStockBtn').addEventListener('click', () => handleStockChange(false));

productModal.addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});

// Initial Load
// The server will send the initial stock list