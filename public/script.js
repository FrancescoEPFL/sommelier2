// René - AI Sommelier Frontend Script
// Ottimizzato con gestione errori e timeout robusti

// State Management
const state = {
    selectedDishes: [],
    dishes: [],
    wines: [],
    currentAvatar: 'idle'
};

// Avatar States
const avatarStates = {
    idle: 'avatar-idle',
    thinking: 'avatar-thinking',
    suggesting: 'avatar-suggesting',
    happy: 'avatar-happy'
};

// DOM Elements
const elements = {
    menuGrid: document.getElementById('menu-grid'),
    btnConsiglia: document.getElementById('btn-consiglia'),
    reneMessage: document.getElementById('rene-message'),
    selectedDishesDisplay: document.getElementById('selected-dishes-display'),
    selectedDishesList: document.getElementById('selected-dishes-list'),
    loadingState: document.getElementById('loading-state'),
    recommendationsSection: document.getElementById('recommendations-section'),
    recommendationsContent: document.getElementById('recommendations-content')
};

// Initialize App
async function init() {
    try {
        showMessage('Sto preparando il menu per voi...', 'thinking');
        await loadDatabase();
        renderMenu();
        setupEventListeners();
        setAvatarState('idle');
        showMessage('Selezionate i vostri piatti preferiti e permettetemi di guidarvi attraverso un\'esperienza enologica indimenticabile.');
    } catch (error) {
        console.error('Errore di inizializzazione:', error);
        showMessage('Mi dispiace, si è verificato un errore nel caricare il menu. Per favore, ricaricate la pagina.', 'idle');
        showErrorNotification('Errore di caricamento del menu');
    }
}

// Load Database
async function loadDatabase() {
    try {
        const response = await fetch('/database.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        state.dishes = data.piatti || [];
        state.wines = data.vini || [];
        
        if (state.dishes.length === 0) {
            throw new Error('Nessun piatto trovato nel database');
        }
    } catch (error) {
        console.error('Errore nel caricamento del database:', error);
        throw new Error('Impossibile caricare il menu. Verificate che database.json sia presente.');
    }
}

// Render Menu
function renderMenu() {
    if (!elements.menuGrid || state.dishes.length === 0) {
        console.error('Impossibile renderizzare il menu');
        return;
    }
    
    elements.menuGrid.innerHTML = state.dishes.map(dish => `
        <div class="card-dish bg-gray-900 rounded-2xl p-6 shadow-xl border border-gray-700" 
             data-dish-id="${dish.id}"
             role="button"
             tabindex="0"
             aria-pressed="false">
            <div class="mb-4">
                <span class="badge bg-amber-600 text-white">${dish.categoria}</span>
                <span class="badge bg-gray-700 text-gray-300 ml-2">${dish.intensita}</span>
            </div>
            <h3 class="text-2xl font-bold text-amber-400 mb-3">${dish.nome}</h3>
            <p class="text-gray-300 mb-4">${dish.descrizione}</p>
            <div class="flex flex-wrap gap-2">
                ${dish.note_aromatiche.map(nota => 
                    `<span class="text-xs bg-gray-800 text-amber-300 px-3 py-1 rounded-full">${nota}</span>`
                ).join('')}
            </div>
        </div>
    `).join('');
}

// Setup Event Listeners
function setupEventListeners() {
    // Dish selection
    elements.menuGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.card-dish');
        if (card) {
            toggleDishSelection(parseInt(card.dataset.dishId));
        }
    });
    
    // Keyboard accessibility
    elements.menuGrid.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const card = e.target.closest('.card-dish');
            if (card) {
                e.preventDefault();
                toggleDishSelection(parseInt(card.dataset.dishId));
            }
        }
    });
    
    // Consiglia button
    elements.btnConsiglia.addEventListener('click', handleConsiglio);
}

// Toggle Dish Selection
function toggleDishSelection(dishId) {
    const index = state.selectedDishes.indexOf(dishId);
    const card = document.querySelector(`[data-dish-id="${dishId}"]`);
    
    if (index === -1) {
        // Add dish
        if (state.selectedDishes.length >= 5) {
            showErrorNotification('Potete selezionare massimo 5 piatti');
            return;
        }
        state.selectedDishes.push(dishId);
        card.classList.add('selected');
        card.setAttribute('aria-pressed', 'true');
    } else {
        // Remove dish
        state.selectedDishes.splice(index, 1);
        card.classList.remove('selected');
        card.setAttribute('aria-pressed', 'false');
    }
    
    updateSelectedDishesDisplay();
    updateConsigliButton();
    updateReneMessage();
}

// Update Selected Dishes Display
function updateSelectedDishesDisplay() {
    if (state.selectedDishes.length === 0) {
        elements.selectedDishesDisplay.classList.add('hidden');
        return;
    }
    
    elements.selectedDishesDisplay.classList.remove('hidden');
    elements.selectedDishesList.innerHTML = state.selectedDishes.map(dishId => {
        const dish = state.dishes.find(d => d.id === dishId);
        return `<span class="badge bg-amber-700 text-white">${dish.nome}</span>`;
    }).join('');
}

// Update Consiglia Button
function updateConsigliButton() {
    if (state.selectedDishes.length > 0) {
        elements.btnConsiglia.disabled = false;
        elements.btnConsiglia.textContent = `Consigliatemi i Vini (${state.selectedDishes.length} ${state.selectedDishes.length === 1 ? 'piatto' : 'piatti'})`;
    } else {
        elements.btnConsiglia.disabled = true;
        elements.btnConsiglia.textContent = 'Consigliatemi i Vini Perfetti';
    }
}

// Update René Message
function updateReneMessage() {
    const count = state.selectedDishes.length;
    
    if (count === 0) {
        showMessage('Selezionate i vostri piatti preferiti e permettetemi di guidarvi attraverso un\'esperienza enologica indimenticabile.');
    } else if (count === 1) {
        showMessage('Ottima scelta! Posso consigliarvi il vino perfetto, o desiderate aggiungere altri piatti?');
    } else {
        showMessage(`Eccellente! ${count} piatti selezionati. Permettetemi di trovare gli abbinamenti ideali per questa esperienza culinaria.`);
    }
}

// Handle Consiglio Request
async function handleConsiglio() {
    if (state.selectedDishes.length === 0) return;
    
    // Show loading state
    setLoadingState(true);
    setAvatarState('thinking');
    showMessage('Sto consultando la mia cantina per trovare gli abbinamenti perfetti...');
    
    // Hide previous recommendations
    elements.recommendationsSection.classList.add('hidden');
    
    try {
        const selectedDishesData = state.selectedDishes.map(id => 
            state.dishes.find(d => d.id === id)
        );
        
        const response = await fetchWithTimeout('/api/consiglio', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                piatti: selectedDishesData
            })
        }, 30000); // 30 second timeout
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Errore del server: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.consiglio) {
            throw new Error('Risposta del server non valida');
        }
        
        displayRecommendations(data.consiglio);
        setAvatarState('suggesting');
        showMessage('Ecco i miei consigli per esaltare al meglio i vostri piatti!');
        
        // Scroll to recommendations
        setTimeout(() => {
            elements.recommendationsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 500);
        
    } catch (error) {
        console.error('Errore nella richiesta di consiglio:', error);
        handleConsigliError(error);
    } finally {
        setLoadingState(false);
    }
}

// Fetch with Timeout
function fetchWithTimeout(url, options = {}, timeout = 30000) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout: la richiesta ha impiegato troppo tempo')), timeout)
        )
    ]);
}

// Handle Consiglio Error
function handleConsigliError(error) {
    setAvatarState('idle');
    
    let errorMessage = 'Mi dispiace, ho difficoltà a raggiungere la cantina in questo momento. ';
    
    if (error.message.includes('Timeout')) {
        errorMessage += 'Il server sta impiegando troppo tempo a rispondere. Per favore, riprovate tra qualche istante.';
    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage += 'Verificate la vostra connessione internet e riprovate.';
    } else if (error.message.includes('API key')) {
        errorMessage += 'Si è verificato un problema con la configurazione del servizio. Contattate l\'amministratore.';
    } else {
        errorMessage += error.message || 'Si è verificato un errore imprevisto.';
    }
    
    showMessage(errorMessage);
    showErrorNotification('Errore: ' + (error.message || 'Errore sconosciuto'));
}

// Display Recommendations
function displayRecommendations(consiglio) {
    setAvatarState('happy');
    
    // Parse the recommendation text
    const formattedConsiglio = formatConsiglio(consiglio);
    
    elements.recommendationsContent.innerHTML = `
        <div class="wine-recommendation bg-gray-900 rounded-2xl p-8 border border-amber-700 shadow-2xl">
            <div class="prose prose-invert prose-amber max-w-none">
                ${formattedConsiglio}
            </div>
            <div class="mt-8 pt-6 border-t border-gray-700 text-center">
                <button onclick="resetSelection()" 
                        class="bg-gray-800 hover:bg-gray-700 text-amber-400 font-semibold py-2 px-6 rounded-full transition-all">
                    Nuova Selezione
                </button>
            </div>
        </div>
    `;
    
    elements.recommendationsSection.classList.remove('hidden');
}

// Format Consiglio
function formatConsiglio(text) {
    // 1. Pulizia radicale: rimuove qualsiasi residuo di tag o classi inserite dall'AI
    let cleanText = text.replace(/<[^>]*>/g, '') // Rimuove tutti i tag HTML
                        .replace(/class="[^ Vinciguerra-projects]*"/g, '') // Rimuove classi CSS
                        .replace(/"mb-4">/g, ''); // Rimuove specificamente il refuso mb-4

    // 2. Formattazione: trasforma il grassetto Markdown in oro René
    let paragraphs = cleanText.split('\n').filter(p => p.trim() !== '');
    
    let htmlOutput = paragraphs.map(p => {
        // Applica il colore oro al testo tra asterischi
        let formattedPara = p.replace(/\*\*(.*?)\*\*/g, '<strong class="text-amber-400 font-bold">$1</strong>');
        
        // Se il paragrafo è la curiosità, aggiungiamo uno stile leggermente diverso
        if (formattedPara.startsWith('Curiosità:')) {
            return `<p class="mt-4 pt-4 border-t border-gray-800 italic text-gray-400 text-sm leading-relaxed">${formattedPara}</p>`;
        }
        return `<p class="mb-4 text-gray-200 leading-relaxed">${formattedPara}</p>`;
    }).join('');

    return htmlOutput;
}

// Reset Selection
function resetSelection() {
    // Clear selected dishes
    state.selectedDishes = [];
    
    // Remove visual selection from cards
    document.querySelectorAll('.card-dish.selected').forEach(card => {
        card.classList.remove('selected');
        card.setAttribute('aria-pressed', 'false');
    });
    
    // Hide recommendations
    elements.recommendationsSection.classList.add('hidden');
    
    // Reset UI
    updateSelectedDishesDisplay();
    updateConsigliButton();
    setAvatarState('idle');
    showMessage('Selezionate nuovamente i vostri piatti per ricevere nuovi consigli enologici.');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Set Avatar State
function setAvatarState(stateName) {
    if (state.currentAvatar === stateName) return;
    
    // Hide all avatars
    Object.values(avatarStates).forEach(id => {
        const img = document.getElementById(id);
        if (img) img.classList.remove('active');
    });
    
    // Show selected avatar
    const targetAvatar = document.getElementById(avatarStates[stateName]);
    if (targetAvatar) {
        targetAvatar.classList.add('active');
        state.currentAvatar = stateName;
    }
}

// Show Message
function showMessage(message, avatarState = null) {
    if (elements.reneMessage) {
        elements.reneMessage.textContent = message;
    }
    if (avatarState) {
        setAvatarState(avatarState);
    }
}

// Set Loading State
function setLoadingState(isLoading) {
    if (isLoading) {
        elements.btnConsiglia.disabled = true;
        elements.loadingState.classList.remove('hidden');
    } else {
        elements.btnConsiglia.disabled = false;
        elements.loadingState.classList.add('hidden');
    }
}

// Show Error Notification
function showErrorNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'error-message fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-md';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.transition = 'opacity 0.5s';
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for use in HTML onclick
window.resetSelection = resetSelection;
