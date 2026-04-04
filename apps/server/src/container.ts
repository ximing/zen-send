import { useContainer } from 'routing-controllers';
import { Container } from 'typedi';

// Set up routing-controllers to use TypeDI container
// IMPORTANT: This must be imported before any controllers
useContainer(Container);
