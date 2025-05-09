// DOM Elements
const uploadBox = document.getElementById('uploadBox');
const imageInput = document.getElementById('imageInput');
const submitBtn = document.getElementById('submitBtn');
const loadingSection = document.getElementById('loadingSection');
const resultsSection = document.getElementById('resultsSection');
const ideasList = document.getElementById('ideasList');
const artistMessage = document.getElementById('artistMessage');
const copyBtn = document.getElementById('copyBtn');
const materialDescription = document.getElementById('materialDescription');
const imageDescription = document.getElementById('imageDescription');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Backend API URLs
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:3000' 
  : ''; // Empty string means same origin when deployed

const API_ENDPOINTS = {
  image: `${API_URL}/api/analyze-image`,
  text: `${API_URL}/api/analyze-text`,
  test: `${API_URL}/api/test`
};

// Offline mode fallback responses
const OFFLINE_RESPONSES = {
  fabric: {
    ideas: [
      "Create unique patchwork tote bags or pouches",
      "Make fabric-covered journals or photo albums",
      "Create decorative wall hangings or quilted art pieces"
    ],
    message: "Hello! I have some interesting fabric scraps that would be perfect for creative projects. These materials have lots of potential for upcycling into something beautiful. Would you be interested in using them for your artistic work?"
  },
  wood: {
    ideas: [
      "Create small wooden jewelry or trinket boxes",
      "Make custom wooden coasters or serving boards",
      "Design wall-mounted wooden key or jewelry holders"
    ],
    message: "Hello! I have some leftover wood pieces that would be perfect for small woodworking projects. Would you be interested in transforming them into something useful and beautiful?"
  },
  metal: {
    ideas: [
      "Create unique metal jewelry or pendants",
      "Design industrial-style home decor items",
      "Make mixed-media art pieces incorporating the metal elements"
    ],
    message: "Hello! I have some interesting metal materials that would be perfect for creative metalwork projects. Would you be interested in using them in your artistic creations?"
  },
  plastic: {
    ideas: [
      "Create colorful mosaic-style art from cut plastic pieces",
      "Make unique decorative planters or containers",
      "Design upcycled accessories like earrings or keychains"
    ],
    message: "Hello! I have some interesting plastic materials that could be transformed into something new and creative. Would you be interested in giving them a second life in your artistic projects?"
  },
  paper: {
    ideas: [
      "Create handmade paper products like cards or notebooks",
      "Design paper mache decorative items or sculptures",
      "Make collage art or paper quilling projects"
    ],
    message: "Hello! I have some interesting paper materials that would be perfect for paper crafting projects. Would you be interested in transforming them into something creative and beautiful?"
  },
  glass: {
    ideas: [
      "Create mosaic art pieces using the glass fragments",
      "Design sun catchers or window hangings",
      "Make unique jewelry incorporating glass elements"
    ],
    message: "Hello! I have some interesting glass materials that would be perfect for creative glass projects. Would you be interested in transforming them into something beautiful and unique?"
  },
  default: {
    ideas: [
      "Create mixed-media artwork incorporating the materials",
      "Design functional home decor items showcasing the material's unique properties",
      "Make wearable art or accessories featuring the material as focal points"
    ],
    message: "Hello! I have some interesting materials that would be perfect for creative projects. Would you be interested in exploring how these materials could inspire your work? I'd love to see what you create with them!"
  }
};

// Check if the API is available
async function checkApiAvailability() {
  try {
    const response = await fetch(API_ENDPOINTS.test);
    if (response.ok) {
      const data = await response.json();
      console.log('API test results:', data);
      return data.api_key_configured;
    }
    return false;
  } catch (error) {
    console.error('API test failed:', error);
    return false;
  }
}

// Initial API check
let apiAvailable = true;
checkApiAvailability().then(available => {
  apiAvailable = available;
  console.log('API available:', apiAvailable);
  
  if (!apiAvailable) {
    showToast('API key not configured or unavailable. Some features may be limited.');
  }
});

// Event Listeners
uploadBox.addEventListener('click', () => imageInput.click());
uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.style.borderColor = '#6366f1';
});
uploadBox.addEventListener('dragleave', () => {
    uploadBox.style.borderColor = '#27272a';
});
uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.style.borderColor = '#27272a';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        handleImageUpload(file);
    } else {
        alert('Please upload an image file (JPEG, PNG, etc.)');
    }
});

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if (file.type.startsWith('image/')) {
            handleImageUpload(file);
        } else {
            alert('Please upload an image file (JPEG, PNG, etc.)');
            imageInput.value = ''; // Clear the input
        }
    }
});

materialDescription.addEventListener('input', () => {
    submitBtn.disabled = !materialDescription.value.trim();
});

imageDescription.addEventListener('input', () => {
    // If we have text in the image description, enable the submit button
    updateImageTabSubmitState();
});

function updateImageTabSubmitState() {
    if (tabBtns[0].classList.contains('active')) {
        // We're in the image tab
        submitBtn.disabled = !imageInput.files[0] && !imageDescription.value.trim();
    }
}

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        // Update active tab button
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Show active tab content
        tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === `${tab}Tab`) {
                content.classList.add('active');
            }
        });

        // Reset submit button state
        if (tab === 'image') {
            updateImageTabSubmitState();
        } else {
            submitBtn.disabled = !materialDescription.value.trim();
        }
    });
});

submitBtn.addEventListener('click', handleSubmit);
copyBtn.addEventListener('click', copyMessageToClipboard);

// Functions
function handleImageUpload(file) {
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('Image is too large. Please upload an image under 5MB.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        uploadBox.style.backgroundImage = `url(${e.target.result})`;
        uploadBox.style.backgroundSize = 'cover';
        uploadBox.style.backgroundPosition = 'center';
        uploadBox.querySelector('.upload-content').style.display = 'none';
        submitBtn.disabled = false;
        
        // Clear the image description when an image is uploaded
        imageDescription.value = '';
    };
    reader.onerror = () => {
        alert('Error reading file. Please try again.');
    };
    reader.readAsDataURL(file);
}

async function handleSubmit() {
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    
    // Validation for image tab
    if (activeTab === 'image') {
        if (!imageInput.files[0] && !imageDescription.value.trim()) {
            alert('Please either upload an image or describe the image of your material.');
            return;
        }
    }
    
    // Validation for text tab
    if (activeTab === 'text' && !materialDescription.value.trim()) {
        alert('Please enter a description of your material.');
        return;
    }
    
    // Show loading state
    submitBtn.disabled = true;
    loadingSection.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    
    // Update loading message
    if (activeTab === 'image') {
        document.querySelector('#loadingSection p').textContent = 
            imageInput.files[0] ? 'Analyzing your material image...' : 'Analyzing your image description...';
    } else {
        document.querySelector('#loadingSection p').textContent = 'Analyzing your material description...';
    }

    try {
        // Always attempt to use the API first
        let response;
        
        if (activeTab === 'image') {
            if (imageInput.files[0]) {
                // Process image
                const base64Image = await getBase64(imageInput.files[0]);
                response = await analyzeImage(base64Image);
                console.log("RECEIVED IMAGE RESPONSE:", response);
            } else {
                // Process image description
                response = await analyzeText(imageDescription.value);
                console.log("RECEIVED TEXT DESCRIPTION RESPONSE:", response);
            }
        } else {
            // Process material description text
            response = await analyzeText(materialDescription.value);
            console.log("RECEIVED MATERIAL DESCRIPTION RESPONSE:", response);
        }
        
        if (response.error) {
            throw new Error(response.error);
        }
        
        // Check if we're getting a default offline response
        const isDefaultResponse = 
            response.ideas && 
            response.ideas.length === 3 && 
            response.ideas[0] === "Create mixed-media artwork incorporating the materials" &&
            response.ideas[1] === "Design functional home decor items showcasing the material's unique properties" &&
            response.ideas[2] === "Make wearable art or accessories featuring the material as focal points";
        
        if (isDefaultResponse) {
            console.warn("Default/offline response detected. API might not be working correctly.");
            showToast("API may not be working correctly. Results may be generic.");
        }
        
        if (response.fallback_ideas && response.fallback_message) {
            console.warn('Server returned fallback response. API might be having issues.');
            showToast('Using server fallback response. Results may be generic.');
        }
        
        displayResults(response);
    } catch (error) {
        console.error('Error:', error);
        
        // Generate better error messages
        let errorMessage = 'An error occurred. Using fallback responses.';
        if (error.message) {
            if (error.message.includes('API key')) {
                errorMessage = 'API key error. Using fallback responses.';
            } else if (error.message.includes('network')) {
                errorMessage = 'Network error. Using fallback responses.';
            } else if (error.message.includes('timeout')) {
                errorMessage = 'Request timed out. Using fallback responses.';
            } else {
                errorMessage = `Error: ${error.message}. Using fallback responses.`;
            }
        }
        
        console.log(errorMessage);
        
        // Show a more visible error to the user
        showToast(errorMessage);
        
        // Use offline response
        const offlineResponse = getOfflineResponse(
            activeTab === 'image' ? 
                (imageDescription.value || 'default') : 
                materialDescription.value
        );
        displayResults(offlineResponse);
    } finally {
        loadingSection.classList.add('hidden');
        submitBtn.disabled = false;
    }
}

function simulateLoading() {
    return new Promise(resolve => setTimeout(resolve, 1500));
}

function getOfflineResponse(text) {
    if (typeof text === 'string') {
        const lowercaseText = text.toLowerCase();
        
        if (lowercaseText.includes('fabric') || lowercaseText.includes('textile') || lowercaseText.includes('cloth')) {
            return OFFLINE_RESPONSES.fabric;
        } else if (lowercaseText.includes('wood') || lowercaseText.includes('timber') || lowercaseText.includes('plywood')) {
            return OFFLINE_RESPONSES.wood;
        } else if (lowercaseText.includes('metal') || lowercaseText.includes('steel') || lowercaseText.includes('aluminum')) {
            return OFFLINE_RESPONSES.metal;
        } else if (lowercaseText.includes('plastic') || lowercaseText.includes('polymer')) {
            return OFFLINE_RESPONSES.plastic;
        } else if (lowercaseText.includes('paper') || lowercaseText.includes('cardboard') || lowercaseText.includes('card stock')) {
            return OFFLINE_RESPONSES.paper;
        } else if (lowercaseText.includes('glass')) {
            return OFFLINE_RESPONSES.glass;
        }
    }
    
    return OFFLINE_RESPONSES.default;
}

function showToast(message) {
    // Create toast element if it doesn't exist
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        toast.style.color = 'white';
        toast.style.padding = '10px 20px';
        toast.style.borderRadius = '5px';
        toast.style.zIndex = '1000';
        toast.style.transition = 'opacity 0.3s ease-in-out';
        document.body.appendChild(toast);
    }
    
    // Show the toast
    toast.textContent = message;
    toast.style.opacity = '1';
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
    }, 3000);
}

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // Extract the base64 data without the prefix
            const result = reader.result.split(',')[1];
            console.log(`Converted image to base64 (${Math.round(result.length / 1024)} KB)`);
            resolve(result);
        };
        reader.onerror = (error) => reject(error);
    });
}

async function analyzeImage(base64Image) {
    try {
        // Check base64Image
        if (!base64Image || base64Image.length < 100) {
            console.error('Invalid base64 image data');
            throw new Error('Invalid image data');
        }
        
        console.log('Sending image to backend API');
        const response = await fetch(API_ENDPOINTS.image, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ base64Image })
        });

        // Check for non-200 responses
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server responded with status ${response.status}`);
        }

        console.log('Received response from backend API with status:', response.status);
        const responseData = await response.json();
        
        // Debug response
        console.log('Response data (ideas):', responseData.ideas);
        console.log('Response data (message):', responseData.message ? responseData.message.substring(0, 50) + '...' : 'No message');
        
        return responseData;
    } catch (error) {
        console.error('Error analyzing image:', error);
        throw error; // Re-throw to handle in the main handler
    }
}

async function analyzeText(text) {
    try {
        if (!text || text.trim().length < 3) {
            throw new Error('Text description too short');
        }
        
        console.log('Sending text to backend API');
        const response = await fetch(API_ENDPOINTS.text, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text })
        });

        // Check for non-200 responses
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server responded with status ${response.status}`);
        }

        console.log('Received response from backend API with status:', response.status);
        const responseData = await response.json();
        
        // Debug response
        console.log('Response data (ideas):', responseData.ideas);
        console.log('Response data (message):', responseData.message ? responseData.message.substring(0, 50) + '...' : 'No message');
        
        return responseData;
    } catch (error) {
        console.error('Error analyzing text:', error);
        throw error; // Re-throw to handle in the main handler
    }
}

function displayResults(response) {
    // Clear previous results
    ideasList.innerHTML = '';
    
    if (!response || !response.ideas || response.ideas.length === 0) {
        console.error('Invalid response format:', response);
        response = getOfflineResponse('default');
    }
    
    // Display ideas
    response.ideas.forEach(idea => {
        const li = document.createElement('li');
        li.textContent = idea;
        ideasList.appendChild(li);
    });

    // Display message
    artistMessage.textContent = response.message || '';

    // Show results
    resultsSection.classList.remove('hidden');
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function copyMessageToClipboard() {
    navigator.clipboard.writeText(artistMessage.textContent)
        .then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        })
        .catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy text. Please try again or copy manually.');
        });
} 