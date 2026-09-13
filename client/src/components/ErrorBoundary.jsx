 import { Component } from 'react';

   class ErrorBoundary extends Component {
     state = { hasError: false };

     static getDerivedStateFromError() {
       return { hasError: true };
     }

     componentDidCatch(error, info) {
       console.error('Uncaught error:', error, info);
     }

     render() {
       if (this.state.hasError) {
         return (
           <div className="p-8 text-center">
             <p className="text-lg font-bold">Something went wrong.</p>
             <p className="text-sm">Try refreshing the page.</p>
           </div>
         );
       }
       return this.props.children;
     }
   }

   export default ErrorBoundary;
