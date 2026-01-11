import Web3 from "web3";

const getWeb3 = () =>
  new Promise((resolve, reject) => {
    console.log("getWeb3 called, document readyState:", document.readyState);
    // Check if page is already loaded
    if (document.readyState === "complete") {
      console.log("Document already loaded, initializing Web3 immediately");
      initializeWeb3(resolve, reject);
    } else {
      console.log("Document not loaded, waiting for load event");
      // Wait for loading completion to avoid race conditions with web3 injection timing.
      window.addEventListener("load", async () => {
        console.log("Window load event fired, initializing Web3");
        initializeWeb3(resolve, reject);
      });
    }
  });

const initializeWeb3 = (resolve, reject) => {
  try {
    console.log("Initializing Web3 provider");
    // Force use of local ganache provider for demo
    const provider = new Web3.providers.HttpProvider("http://127.0.0.1:8545");
    const web3 = new Web3(provider);
    console.log("Web3 initialized successfully:", web3);
    resolve(web3);
  } catch (error) {
    console.error("Error connecting to local blockchain:", error);
    reject(error);
  }
};

export default getWeb3;