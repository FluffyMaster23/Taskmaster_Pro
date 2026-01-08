# Amazon Polly Voice Integration (Future Enhancement)

## Overview
Amazon Polly is a text-to-speech service that can provide high-quality, natural-sounding voices beyond what's available through the Web Speech API.

## Requirements
- AWS Account
- AWS SDK for JavaScript v3
- AWS Cognito for authentication (recommended for browser apps)
- IAM role with Polly permissions

## Implementation Steps

### 1. Install AWS SDK
```html
<script src="https://sdk.amazonaws.com/js/aws-sdk-2.1.24.min.js"></script>
```

### 2. Configure AWS Credentials (using Cognito Identity Pool)
```javascript
AWS.config.region = 'us-east-1'; // Your region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
  IdentityPoolId: 'YOUR_IDENTITY_POOL_ID'
});
```

### 3. Add Polly Voices to Voice Selector
```javascript
function loadPollyVoices() {
  const pollyVoices = [
    { name: 'Joanna', lang: 'en-US', engine: 'neural' },
    { name: 'Matthew', lang: 'en-US', engine: 'neural' },
    { name: 'Kendra', lang: 'en-US', engine: 'neural' },
    { name: 'Joey', lang: 'en-US', engine: 'neural' },
    { name: 'Salli', lang: 'en-US', engine: 'neural' }
  ];
  
  // Add to voice dropdown with "Polly:" prefix
  pollyVoices.forEach(voice => {
    const option = document.createElement("option");
    option.value = `polly:${voice.name}`;
    option.textContent = `Polly: ${voice.name} (${voice.lang}) - Neural`;
    option.dataset.pollyVoice = 'true';
    option.dataset.voiceId = voice.name;
    option.dataset.engine = voice.engine;
    voiceSelect.appendChild(option);
  });
}
```

### 4. Implement Polly Speech Function
```javascript
async function speakWithPolly(text, voiceId, engine = 'neural') {
  const polly = new AWS.Polly();
  
  const params = {
    Text: text,
    OutputFormat: 'mp3',
    VoiceId: voiceId,
    Engine: engine
  };
  
  try {
    const data = await polly.synthesizeSpeech(params).promise();
    
    // Create audio from the stream
    const audioBlob = new Blob([data.AudioStream], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    audio.onended = () => URL.revokeObjectURL(audioUrl);
    await audio.play();
    
  } catch (error) {
    console.error('Polly speech error:', error);
    // Fallback to Web Speech API
    speak(text);
  }
}
```

### 5. Update speak() Function to Handle Both
```javascript
function speak(text) {
  if (window.selectedVoice && window.selectedVoice.startsWith('polly:')) {
    const voiceId = window.selectedVoice.replace('polly:', '');
    speakWithPolly(text, voiceId);
  } else {
    // Existing Web Speech API code
    const utter = new SpeechSynthesisUtterance(text);
    // ... rest of existing code
  }
}
```

## Security Considerations
- Never hardcode AWS credentials in frontend code
- Use Cognito Identity Pool with unauthenticated access for public users
- Set appropriate IAM policies to limit Polly usage
- Consider implementing usage limits to prevent abuse
- Monitor costs (Polly charges per character)

## Cost Considerations
- Polly Standard voices: $4 per 1 million characters
- Polly Neural voices: $16 per 1 million characters
- First 12 months: 5 million characters free (Standard), 1 million (Neural)

## Alternative: Pre-recorded Polly Audio
For cost savings, consider pre-generating common phrases with Polly and hosting them as MP3 files:
- Welcome messages
- Task reminders
- Status updates

This eliminates runtime API calls but reduces flexibility.

## Status
⏸️ **Not Implemented** - Requires AWS account setup and additional configuration
