require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Multiple ways to get the API key to make it more reliable
let GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Try to read from .env file directly if environment variable approach failed
if (!GEMINI_API_KEY) {
  try {
    console.log('Trying to read API key from .env file directly');
    if (fs.existsSync('.env')) {
      const envContent = fs.readFileSync('.env', 'utf8');
      const apiKeyMatch = envContent.match(/GEMINI_API_KEY=([^\s\r\n]+)/);
      if (apiKeyMatch && apiKeyMatch[1]) {
        GEMINI_API_KEY = apiKeyMatch[1];
        console.log('Successfully read API key from .env file directly');
      }
    }
  } catch (error) {
    console.error('Error reading .env file:', error);
  }
}

// Fallback hardcoded key if all else fails
if (!GEMINI_API_KEY) {
  console.log('Using hardcoded fallback API key');
  GEMINI_API_KEY = 'AIzaSyBpW9Skm66IfyL6Rz9U0jtHIn2wST1_1X4';
}

console.log('API Key configured:', GEMINI_API_KEY ? 'YES (length: ' + GEMINI_API_KEY.length + ')' : 'NO');

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Increased limit for base64 images
app.use(express.static(path.join(__dirname, './'))); // Serve static files from root directory

// Enhanced logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Routes
app.post('/api/analyze-image', async (req, res) => {
  try {
    console.log('Image analysis request received');
    const { base64Image } = req.body;
    
    if (!base64Image) {
      console.error('No image data received');
      return res.status(400).json({ error: 'No image provided' });
    }

    console.log(`Received image data length: ${base64Image.length} characters`);
    
    // Check if the base64 data is valid
    if (base64Image.length < 100) {
      console.error('Image data too short, likely invalid');
      return res.status(400).json({ error: 'Invalid image data' });
    }
    
    // Improved prompt with detailed instructions for more specific and creative responses
    const prompt = `
You are a materials innovation expert with 20+ years of experience in circular design and creative reuse for small businesses. 

TASK:
First, analyze the exact material shown in this image with extraordinary detail:
1. Material composition (what is it made of?)
2. Physical properties (texture, flexibility, strength, etc.)
3. Visual attributes (color, pattern, finish)
4. Dimensions and form factor
5. Current condition/quality

Then, provide:
1. THREE highly specific, commercially viable reuse ideas tailored to this EXACT material
2. A personalized message for local artists or makers

REUSE IDEAS MUST BE:
- Precisely matched to THIS specific material's unique properties
- Immediately implementable with minimal processing or additional materials
- Value-adding (creates products that people would actually buy)
- Specific enough that a small business could implement immediately
- Novel yet practical (not generic recycling suggestions)
- Considerate of the material's scale, form factor, and inherent qualities

Each idea must include:
- A specific end product/application
- Why this material is uniquely suited for this purpose
- A brief note on implementation approach
- The target market or usage context

MESSAGE REQUIREMENTS:
- Reference specific unique properties you observed in the material image
- Be warm, professional and enthusiastic (150-200 words)
- Highlight the material's distinctive creative potential
- Explain why makers would want this specific material
- End with a clear collaboration invitation

Your primary value is in the extreme specificity of your analysis and ideas. Generic suggestions will not help the user.
`;
    
    console.log('Sending request to Gemini Vision API with enhanced prompt');
    console.log('API Key being used (first 4 chars):', GEMINI_API_KEY.substring(0, 4) + '...');
    
    const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent';
    
    try {
      console.log('Attempting API call to Gemini...');
      
      // Create request payload
      const requestPayload = {
        contents: [{
          parts: [
            {
              text: prompt
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 800
        }
      };
      
      // Log request payload size
      console.log('Request payload size:', JSON.stringify(requestPayload).length);
      
      // Make the request with axios
      const response = await axios.post(
        geminiUrl,
        requestPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GEMINI_API_KEY}`
          },
          timeout: 30000 // 30 second timeout
        }
      );
      
      console.log('Received successful response from Gemini API');
      console.log('Response status:', response.status);
      
      if (!response.data || !response.data.candidates || !response.data.candidates[0]) {
        console.error('Invalid response structure:', JSON.stringify(response.data).substring(0, 200));
        return res.status(500).json({ error: 'Invalid API response structure' });
      }
      
      // Log the full text response from Gemini for debugging
      console.log('Full Gemini response text:');
      console.log(response.data.candidates[0].content.parts[0].text);
      
      const parsedResponse = parseGeminiResponse(response.data);
      console.log('Parsed response:', JSON.stringify(parsedResponse));
      
      res.json(parsedResponse);
    } catch (apiError) {
      console.error('API call failed, logging detailed error information:');
      if (apiError.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response status:', apiError.response.status);
        console.error('Response headers:', JSON.stringify(apiError.response.headers));
        console.error('Response data:', JSON.stringify(apiError.response.data));
      } else if (apiError.request) {
        // The request was made but no response was received
        console.error('No response received:', apiError.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', apiError.message);
      }
      console.error('Error config:', apiError.config ? JSON.stringify(apiError.config) : 'No config');
      
      // Generate a fallback response if API call fails
      const fallbackResponse = {
        ideas: [
          "Create decorative wall art by framing the material in shadow boxes",
          "Use the material to create unique handmade notebook or journal covers",
          "Transform the material into eco-friendly gift wrapping alternatives"
        ],
        message: "Hello! I have some interesting materials that would be perfect for creative projects. Would you be interested in using them for your artistic work? These materials have lots of potential for upcycling into something beautiful and unique!"
      };
      
      res.json(fallbackResponse);
    }
  } catch (error) {
    console.error('Error processing image:');
    if (error.response) {
      console.error('API response error:', JSON.stringify(error.response.data));
    } else {
      console.error('Error details:', error.message);
    }
    
    // Always provide a response even if there's an error
    res.status(500).json({ 
      error: 'Failed to analyze image',
      details: error.response?.data || error.message,
      fallback_ideas: [
        "Create decorative wall art using mixed media techniques",
        "Transform into unique handmade jewelry or accessories",
        "Use as material for sustainable home decor items"
      ],
      fallback_message: "Hello! I have some interesting materials that might be perfect for your next creative project. Would you be interested in taking a look? I'd love to see what you could create with them!"
    });
  }
});

app.post('/api/analyze-text', async (req, res) => {
  try {
    console.log('Text analysis request received');
    const { text } = req.body;
    
    if (!text) {
      console.error('No text provided');
      return res.status(400).json({ error: 'No text provided' });
    }

    console.log(`Received text: "${text.substring(0, 100)}..."`);
    
    // Improved prompt with detailed instructions for more specific and creative responses
    const prompt = `
You are a materials innovation expert with 20+ years of experience in circular design and creative reuse for small businesses. 

MATERIAL DESCRIPTION:
"${text}"

TASK:
First, analyze the described material with extraordinary detail:
1. Material composition (what is it made of?)
2. Physical properties (texture, flexibility, strength, etc.)
3. Visual attributes (color, pattern, finish)
4. Dimensions and form factor
5. Current condition/quality

Then, provide:
1. THREE highly specific, commercially viable reuse ideas tailored to this EXACT material
2. A personalized message for local artists or makers

REUSE IDEAS MUST BE:
- Precisely matched to the specific material properties described
- Immediately implementable with minimal processing or additional materials
- Value-adding (creates products that people would actually buy)
- Specific enough that a small business could implement immediately
- Novel yet practical (not generic recycling suggestions)
- Considerate of the material's scale, form factor, and inherent qualities

Each idea must include:
- A specific end product/application
- Why this material is uniquely suited for this purpose
- A brief note on implementation approach
- The target market or usage context

MESSAGE REQUIREMENTS:
- Reference specific unique properties mentioned in the material description
- Be warm, professional and enthusiastic (150-200 words)
- Highlight the material's distinctive creative potential
- Explain why makers would want this specific material
- End with a clear collaboration invitation

Analyze this material description in detail. Then provide:
1. THREE highly specific, practical, and commercially viable reuse ideas tailored to this exact material
2. A personalized, friendly message to local artists or reuse partners

REUSE IDEA GUIDELINES:
- Focus on the unique properties described (texture, color, flexibility, size, etc.)
- Suggest ideas that require minimal additional materials or processing
- Each idea should be innovative but realistic for small businesses or artists
- Include specific applications, not general categories
- Avoid generic suggestions; make them highly specific to THIS material's properties
- Consider the material's scale, texture, color, and physical properties as described

MESSAGE GUIDELINES:
- Write a warm, conversational message (100-150 words)
- Reference specific details from the material description 
- Express genuine enthusiasm about collaboration
- Highlight the material's unique properties and creative potential
- Keep the tone professional but approachable
- End with a clear invitation for them to use the material

Respond in a way that shows you've carefully analyzed the specific material described - not just given generic reuse suggestions.
`;
    
    console.log('Sending request to Gemini Pro API with enhanced prompt');
    console.log('API Key being used (first 4 chars):', GEMINI_API_KEY.substring(0, 4) + '...');
    
    try {
      // Create request payload
      const requestPayload = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 800
        }
      };
      
      // Log request payload size
      console.log('Request payload size:', JSON.stringify(requestPayload).length);
      
      const response = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
        requestPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GEMINI_API_KEY}`
          },
          timeout: 30000 // 30 second timeout
        }
      );
      
      console.log('Received response from Gemini');
      console.log('Response status:', response.status);
      console.log('Response data:', JSON.stringify(response.data).substring(0, 200) + '...');
      
      if (!response.data || !response.data.candidates || !response.data.candidates[0]) {
        console.error('Invalid response structure:', JSON.stringify(response.data).substring(0, 200));
        return res.status(500).json({ error: 'Invalid API response structure' });
      }
      
      // Log the full text response from Gemini for debugging
      console.log('Full Gemini text response:');
      console.log(response.data.candidates[0].content.parts[0].text);
      
      const parsedResponse = parseGeminiResponse(response.data);
      console.log('Parsed response:', JSON.stringify(parsedResponse));
      
      res.json(parsedResponse);
    } catch (apiError) {
      console.error('API call failed, logging detailed error information:');
      if (apiError.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response status:', apiError.response.status);
        console.error('Response headers:', JSON.stringify(apiError.response.headers));
        console.error('Response data:', JSON.stringify(apiError.response.data));
      } else if (apiError.request) {
        // The request was made but no response was received
        console.error('No response received:', apiError.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', apiError.message);
      }
      console.error('Error config:', apiError.config ? JSON.stringify(apiError.config) : 'No config');
      
      // Generate a smarter fallback response based on the text input
      const materialType = 
        text.toLowerCase().includes('fabric') ? 'fabric' : 
        text.toLowerCase().includes('textile') ? 'textile' :
        text.toLowerCase().includes('cloth') ? 'fabric' :
        text.toLowerCase().includes('wood') ? 'wood' : 
        text.toLowerCase().includes('timber') ? 'wood' :
        text.toLowerCase().includes('metal') ? 'metal' : 
        text.toLowerCase().includes('plastic') ? 'plastic' : 
        text.toLowerCase().includes('polymer') ? 'plastic' :
        text.toLowerCase().includes('paper') ? 'paper' : 
        text.toLowerCase().includes('cardboard') ? 'cardboard' :
        text.toLowerCase().includes('glass') ? 'glass' : 'material';
      
      const colorMatch = text.match(/\b(red|blue|green|yellow|orange|purple|pink|black|white|gray|grey|brown|multicolored|colorful|patterned)\b/i);
      const color = colorMatch ? colorMatch[0].toLowerCase() : '';
      
      const sizeMatch = text.match(/\b(\d+)\s*x\s*(\d+)(?:\s*inches|\s*cm|\s*m|\s*ft)?\b/i);
      const sizeMention = sizeMatch ? `${sizeMatch[0]} ` : '';
      
      let fallbackIdeas = [];
      let fallbackMessage = "";
      
      switch(materialType) {
        case 'fabric':
        case 'textile':
          fallbackIdeas = [
            `Create unique patchwork tote bags using the ${color} ${materialType} pieces`,
            `Design decorative throw pillows that showcase the ${color || 'unique'} patterns and textures`,
            `Make fabric-covered journals or photo albums with these ${sizeMention}${materialType} scraps`
          ];
          fallbackMessage = `Hello! I have some interesting ${color} ${materialType} pieces that would be perfect for creative projects. The ${sizeMention}pieces have lots of potential for upcycling into beautiful handmade items. Would you be interested in exploring how these materials could inspire your work? I'd love to see what you create with them!`;
          break;
        
        case 'wood':
        case 'timber':  
          fallbackIdeas = [
            `Create small wooden decorative boxes or trinket holders from the ${sizeMention}pieces`,
            `Design rustic wall art by arranging and mounting the ${color || ''} wood pieces in a geometric pattern`,
            `Make custom wooden coasters or serving boards that highlight the natural grain`
          ];
          fallbackMessage = `Hello! I have some lovely ${color} wood pieces that would be perfect for small woodworking projects. These ${sizeMention}pieces have beautiful natural character and would be ideal for creating handcrafted items. Would you be interested in transforming them into something useful and beautiful? I'd be thrilled to see your creative vision for these materials!`;
          break;
          
        case 'metal':
          fallbackIdeas = [
            `Create industrial-style jewelry using the ${color || ''} metal elements`,
            `Design modern wall hangings or mobiles that showcase the metallic finish`,
            `Craft unique metal bookends or desk organizers with an artistic twist`
          ];
          fallbackMessage = `Hello! I have some interesting ${color} metal materials that would be perfect for creative metalwork projects. These ${sizeMention}pieces have a distinctive character that would add a unique touch to artistic creations. Would you be interested in incorporating them into your work? I'm excited about the possibility of seeing these materials transformed by your creativity!`;
          break;
          
        default:
          fallbackIdeas = [
            `Create mixed-media artwork incorporating the ${color || ''} ${materialType}`,
            `Design functional home decor items showcasing the material's unique properties`,
            `Make wearable art or accessories featuring the ${materialType} as focal points`
          ];
          fallbackMessage = `Hello! I have some interesting ${color} ${materialType} that would be perfect for creative projects. These ${sizeMention}pieces have distinctive qualities that could inspire unique artistic applications. Would you be interested in exploring how these materials could enhance your work? I'm excited about the potential collaborations and would love to see what you create!`;
      }
      
      const fallbackResponse = {
        ideas: fallbackIdeas,
        message: fallbackMessage
      };
      
      res.json(fallbackResponse);
    }
  } catch (error) {
    console.error('Error processing text:');
    if (error.response) {
      console.error('API response error:', JSON.stringify(error.response.data));
    } else {
      console.error('Error details:', error.message);
    }
    
    // Always provide a response even if there's an error
    res.status(500).json({ 
      error: 'Failed to analyze text',
      details: error.response?.data || error.message,
      fallback_ideas: [
        "Create decorative wall art using mixed media techniques",
        "Transform into unique handmade jewelry or accessories",
        "Use as material for sustainable home decor items"
      ],
      fallback_message: "Hello! I have some interesting materials that might be perfect for your next creative project. Would you be interested in taking a look? I'd love to see what you could create with them!"
    });
  }
});

// Improved helper function to parse Gemini API response
function parseGeminiResponse(data) {
  try {
    console.log('Parsing Gemini response');
    const text = data.candidates[0].content.parts[0].text;
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    console.log('Full response text:', text);
    
    // First look for sections and headers to extract ideas and message
    const materialAnalysisSection = findSection(lines, /MATERIAL ANALYSIS|MATERIAL PROPERTIES|ANALYSIS|ASSESSMENT/i);
    const ideasSection = findSection(lines, /REUSE IDEAS|IDEAS|APPLICATIONS|SUGGESTIONS/i);
    const messageSection = findSection(lines, /MESSAGE|ARTIST MESSAGE|MAKER MESSAGE/i);
    
    // Extract ideas using multiple strategies
    let ideas = [];
    
    // Strategy 1: Look for numbered ideas in the ideas section
    if (ideasSection.length > 0) {
      const ideaMatches = [];
      let currentIdea = "";
      let inIdeaBlock = false;
      
      for (let i = 0; i < ideasSection.length; i++) {
        const line = ideasSection[i];
        
        // Look for numbered ideas (1., 2., 3. or Idea 1:, etc.)
        const ideaHeaderMatch = line.match(/^(?:(?:\d+\.)|(?:Idea\s*\d+:?))\s*(.*)/i);
        
        if (ideaHeaderMatch) {
          // If we were building a previous idea, save it
          if (inIdeaBlock && currentIdea.length > 0) {
            ideaMatches.push(currentIdea);
            currentIdea = "";
          }
          
          currentIdea = ideaHeaderMatch[1];
          inIdeaBlock = true;
        } 
        // If we're in an idea block and this isn't a new idea header, append to current idea
        else if (inIdeaBlock && line.length > 0 && !line.match(/^(?:\d+\.|Idea\s*\d+:?)/i)) {
          // Don't add lines that look like new sections
          if (!line.match(/^[A-Z\s]{5,}:/)) {
            currentIdea += " " + line;
          }
        }
      }
      
      // Add the last idea if we were building one
      if (inIdeaBlock && currentIdea.length > 0) {
        ideaMatches.push(currentIdea);
      }
      
      if (ideaMatches.length > 0) {
        ideas = ideaMatches.map(idea => idea.trim());
      }
    }
    
    // Strategy 2: Fallback to original regex patterns if we didn't find ideas
    if (ideas.length === 0) {
      // Get ideas (lines starting with - or * or numbered 1., 2., 3., etc. or containing "Idea #")
      const ideaRegexes = [
        /^[-*•]\s*(.*)/,                      // Lines starting with -, *, or •
        /^\d+\.\s*(.*)/,                      // Lines starting with 1., 2., etc.
        /^[Ii]dea\s*#?\d*\s*:?\s*(.*)/,       // Lines with "Idea #:" pattern
        /^[Ss]uggestion\s*#?\d*\s*:?\s*(.*)/  // Lines with "Suggestion #:" pattern
      ];
      
      for (const line of lines) {
        for (const regex of ideaRegexes) {
          const match = line.match(regex);
          if (match && match[1] && match[1].length > 10) { // Ensure reasonable idea length
            ideas.push(match[1].trim());
            break;
          }
        }
      }
    }
    
    // Strategy 3: If still no ideas, look for paragraphs in the Ideas section
    if (ideas.length === 0 && ideasSection.length > 0) {
      ideas = ideasSection.filter(line => line.length > 40 && !line.match(/IDEA|REUSE|APPLICATION/i)).slice(0, 3);
    }
    
    console.log('Extracted ideas:', ideas);
    
    // Extract message from MESSAGE section
    let message = '';
    if (messageSection.length > 0) {
      // Join all lines that don't look like headers
      message = messageSection
        .filter(line => line.length > 5 && !line.match(/^MESSAGE|^ARTIST/i))
        .join(' ');
    }
    
    // If no message found in a dedicated section, try traditional greeting patterns
    if (!message) {
      const messagePatterns = ['hello', 'hi', 'dear', 'greetings', 'hey'];
      
      // First try to find a message with greeting
      for (const pattern of messagePatterns) {
        const foundLine = lines.find(line => 
          line.toLowerCase().includes(pattern) && line.length > 30
        );
        if (foundLine) {
          message = foundLine;
          // Look for additional message lines that might be part of the same paragraph
          const messageIndex = lines.indexOf(foundLine);
          if (messageIndex !== -1) {
            // Gather multiple lines for the message
            let currentIndex = messageIndex + 1;
            while (currentIndex < lines.length) {
              const nextLine = lines[currentIndex];
              // Stop if we hit a new section or an idea
              if (nextLine && 
                  nextLine.length > 5 && 
                  !nextLine.match(/^[-*•\d]/) &&
                  !ideas.includes(nextLine) &&
                  !nextLine.match(/^[A-Z\s]{5,}:/)) {
                message += ' ' + nextLine;
                currentIndex++;
              } else {
                break;
              }
            }
          }
          break;
        }
      }
    }
    
    // If still no message found, look for longer paragraphs (likely to be the message)
    if (!message) {
      console.log('No message found in sections or with greeting, looking for longer paragraphs');
      const longLines = lines.filter(line => 
        line.length > 80 && 
        !ideas.includes(line) && 
        !line.match(/^[-*•\d]/)
      );
      if (longLines.length > 0) {
        message = longLines[0];
      }
    }
    
    console.log('Extracted message:', message);
    
    // Ensure we have ideas and a message, even if parsing fails
    if (ideas.length === 0) {
      console.log('Falling back to default ideas');
      ideas = [
        "Create decorative wall art by mounting the material in picture frames with complementary backgrounds",
        "Transform the material into unique handmade jewelry or fashion accessories",
        "Use as texture elements in sustainable home decor items like lampshades or coasters"
      ];
    }
    
    if (!message) {
      console.log('Falling back to default message');
      message = "Hello! I have some interesting materials that might be perfect for your next creative project. The possibilities are endless - from art pieces to functional items. Would you be interested in exploring how these materials could inspire your work? I'd love to see what you create with them!";
    }
    
    return { 
      ideas: ideas.slice(0, 3), // Ensure we only return 3 ideas max
      message: message
    };
  } catch (error) {
    console.error('Error parsing Gemini response:', error);
    // Return fallback response if parsing fails
    return {
      ideas: [
        "Create decorative wall art using mixed media techniques",
        "Transform into unique handmade jewelry or accessories",
        "Use as material for sustainable home decor items"
      ],
      message: "Hello! I have some interesting materials that might be perfect for your next creative project. Would you be interested in taking a look? I'd love to see what you could create with them!"
    };
  }
}

// Helper function to find sections in the response
function findSection(lines, headerRegex) {
  const sectionLines = [];
  let inSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this line is a section header
    if (headerRegex.test(line)) {
      inSection = true;
      continue; // Skip the header line itself
    }
    
    // Check if we've hit a new section header
    if (inSection && line.match(/^[A-Z\s]{5,}:$/)) {
      inSection = false;
      continue;
    }
    
    // Add lines that are part of our target section
    if (inSection) {
      sectionLines.push(line);
    }
  }
  
  return sectionLines;
}

// Add a direct test endpoint for debugging
app.get('/api/test', (req, res) => {
  res.json({
    api_key_configured: !!GEMINI_API_KEY,
    api_key_length: GEMINI_API_KEY ? GEMINI_API_KEY.length : 0,
    api_key_first_chars: GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 4) + '...' : 'none',
    environment: process.env.NODE_ENV || 'development',
    server_time: new Date().toISOString(),
    status: 'ok'
  });
});

// Catch-all route to serve the frontend application
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
}); 