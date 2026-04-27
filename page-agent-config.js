// Page Agent Configuration for ajew.org
// This file contains the configuration for Page Agent integration

const PageAgentConfig = {
  // API Settings
  api: {
    provider: 'deepseek',
    model: 'deepseek-chat',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    // API key should be set via environment variable
    apiKey: process.env.DEEPSEEK_API_KEY || null,
    temperature: 0.7,
    maxTokens: 1000
  },
  
  // UI Settings
  ui: {
    position: 'bottom-right',
    theme: 'light',
    language: ['en', 'he'],
    rtlSupport: true,
    autoShow: false,
    debug: false
  },
  
  // Feature Settings
  features: {
    safeMode: true,
    rateLimit: {
      enabled: true,
      requestsPerMinute: 30
    },
    caching: {
      enabled: true,
      ttl: 300 // 5 minutes
    }
  },
  
  // Tool Configuration
  tools: {
    // Built-in tools
    builtIn: ['help', 'search', 'navigate', 'summarize'],
    
    // Custom tools configuration
    custom: {
      'find-teachings': {
        enabled: true,
        description: 'Find teachings about a topic',
        endpoint: '/api/search/teachings'
      },
      'navigate-to-book': {
        enabled: true,
        description: 'Navigate to a specific book/chapter'
      },
      'hebrew-search': {
        enabled: true,
        description: 'חיפוש בעברית',
        rtl: true
      },
      'summarize-teaching': {
        enabled: true,
        description: 'Summarize the current teaching'
      },
      'read-aloud': {
        enabled: false, // Disabled by default
        description: 'Read a section aloud',
        requiresTTS: true
      }
    }
  },
  
  // Search Integration
  search: {
    enabled: true,
    endpoint: 'http://localhost:3001/api/search',
    fallbackEndpoint: '/search',
    timeout: 5000
  },
  
  // Hebrew Support
  hebrew: {
    enabled: true,
    fonts: {
      hebrew: "'Frank Ruhl Libre', serif",
      default: "'Open Sans', sans-serif"
    },
    direction: 'rtl',
    textAlignment: 'right'
  },
  
  // Analytics
  analytics: {
    enabled: true,
    endpoint: '/api/analytics/page-agent',
    trackCommands: true,
    trackErrors: true,
    anonymize: true
  },
  
  // Error Handling
  errors: {
    showToUser: true,
    logToConsole: true,
    fallbackMessages: {
      'api_unavailable': 'Page Agent is temporarily unavailable. Please try again later.',
      'rate_limit': 'Too many requests. Please wait a moment.',
      'network_error': 'Network error. Please check your connection.'
    }
  }
};

// Export for use in browser
if (typeof window !== 'undefined') {
  window.PageAgentConfig = PageAgentConfig;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PageAgentConfig;
}

console.log('Page Agent Configuration loaded');