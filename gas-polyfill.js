/**
 * Google Apps Script (GAS) Polyfill
 * Emulates `google.script.run` for running the frontend entirely outside of the Apps Script iframe.
 * Requires the GAS script to have a CORS-enabled `doPost(e)` API.
 */

// GANTI URL DI BAWAH INI DENGAN URL DEPLOYMENT APP SCRIPT ANDA
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbyO19L3pfMyYOIs-eus5d5KvcRLV2y5rw3YpKfngFGJUDEu_3XbCbOGN_RX2c3UbYnW/exec";

window.google = window.google || {};
window.google.script = window.google.script || {};
window.google.script.run = {
  withSuccessHandler: function(onSuccess) {
    return this._createProxy(onSuccess, null);
  },
  withFailureHandler: function(onFailure) {
    return this._createProxy(null, onFailure);
  },
  _createProxy: function(onSuccess, onFailure) {
    return new Proxy({}, {
      get: function(target, prop) {
        if (prop === 'withSuccessHandler') return (fn) => window.google.script.run._createProxy(fn, onFailure);
        if (prop === 'withFailureHandler') return (fn) => window.google.script.run._createProxy(onSuccess, fn);
        
        return async function(...args) {
          try {
            const res = await fetch(GAS_API_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'text/plain;charset=utf-8',
              },
              body: JSON.stringify({
                method: prop,
                args: args
              })
            });
            
            const data = await res.json();
            
            if (data.error && onFailure) {
              onFailure(new Error(data.error));
            } else if (data.error) {
              console.error("GAS RPC Error:", data.error);
            } else if (onSuccess) {
              onSuccess(data.result);
            }
          } catch(e) {
            if (onFailure) onFailure(e);
            else console.error("GAS RPC Network Error:", e);
          }
        };
      }
    });
  }
};
