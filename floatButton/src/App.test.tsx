import React from 'react';
import { render, screen } from '@testing-library/react';
import App, { AppConf } from './App';

declare global {
  interface Window {
    KEFU_CONFIG: AppConf,
  }
}

const exampleConfig: AppConf = {
  src: '',
  cv_urls: []
}

test('renders learn react link', () => {
  const cf = window.KEFU_CONFIG
  if (!cf) {
    console.warn("window.CHAT_CONFIG has no configuration value")
    console.log("window.CHAT_CONFIG value example: \n", exampleConfig)
    return
  }
  const chatSrc = cf.src
  if (!chatSrc) {
    console.warn("CHAT_CONFIG.src has no configuration value")
    return
  }
  render(<App conf={cf} />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
