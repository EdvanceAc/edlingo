export class ErrorHandler {
  static handle(error, context = '') {
    const errorInfo = {
      message: error.message,
      context,
      timestamp: new Date().toISOString(),
      stack: error.stack
    };

    console.error('Application Error:', errorInfo);

    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(errorInfo);
    }

    return this.getUserFriendlyMessage(error);
  }

  static getUserFriendlyMessage(error) {
    if (error.message.includes('403')) {
      return 'Service temporarily unavailable. Please try again later.';
    }
    if (error.message.includes('network')) {
      return 'Connection issue. Please check your internet connection.';
    }
    return 'An unexpected error occurred. Please try again.';
  }

  static sendToMonitoring(errorInfo) {
    console.log('Would send to monitoring:', errorInfo);
  }
}