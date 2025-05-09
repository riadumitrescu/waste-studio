# Waste-Match Studio

A web application that helps small businesses get creative reuse ideas for leftover materials by analyzing images or descriptions.

## Features

- Upload an image of your material OR describe it in text
- Receive 3 creative reuse ideas from AI
- Get a friendly message to send to local artists or reuse partners
- Modern, responsive UI with dark theme
- Secure backend API that handles Gemini API communication

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Node.js, Express
- **AI**: Google Gemini Vision API (for images) and Gemini Pro API (for text)

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- Google Gemini API key

### Local Development

1. Clone this repository:
   ```
   git clone [repository-url]
   cd waste-match-studio
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```
   GEMINI_API_KEY=your_api_key_here
   PORT=3000
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

### Production Deployment

#### Option 1: Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set the build command to: `npm install`
4. Set the start command to: `npm start` 
5. Add environment variable: `GEMINI_API_KEY=your_api_key_here`
6. Deploy!

#### Option 2: Railway

1. Create a new project on Railway
2. Connect your GitHub repository
3. Add a variable: `GEMINI_API_KEY=your_api_key_here`
4. Deploy!

#### Option 3: Vercel

1. Import your GitHub repository
2. Set the framework preset to "Other"
3. Add environment variable: `GEMINI_API_KEY=your_api_key_here`
4. Deploy!

## Usage

1. Choose input method: "Upload Image" or "Describe Material"
2. Either upload an image of your material or type a description
3. Click "Get Reuse Ideas"
4. View the creative reuse suggestions and artist message
5. Use the "Copy Message" button to copy the message to your clipboard

## How It Works

1. The frontend collects the user's input (image or text)
2. The data is sent to the Node.js backend
3. The backend securely communicates with Google's Gemini API
4. The Gemini API analyzes the material and generates ideas
5. The backend processes the response and returns it to the frontend
6. The frontend displays the results in a user-friendly format

## Troubleshooting

- **API Key Issues**: Make sure your Gemini API key is correctly set in the `.env` file
- **Image Upload Problems**: Check that your image is in a supported format (JPEG, PNG)
- **Server Not Starting**: Ensure port 3000 is not in use by another application

## License

[MIT License](LICENSE)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 