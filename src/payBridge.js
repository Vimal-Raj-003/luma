/* The link between checkout.js (which decides what to pay) and PaymentDialog.jsx (LUMA's "Payment Options" window, mounted once in the navbar).
   The dialog sets bridge.open when it mounts; checkout.js calls it and waits for the customer's choice. */
export const bridge = { open: null }
