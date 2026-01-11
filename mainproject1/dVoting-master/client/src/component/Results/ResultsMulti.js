// Node modules
import React, { Component } from "react";
import { Link } from "react-router-dom";

// Components
import Navbar from "../Navbar/Navigation";
import NavbarAdmin from "../Navbar/NavigationAdmin";

// Contract
import getWeb3 from "../../getWeb3";
import Election from "../../contracts/Election.json";
import ElectionFactory from "../../contracts/ElectionFactory.json";

export default class ResultsMulti extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ElectionFactoryInstance: undefined,
      web3: null,
      account: null,
      isAdmin: false,
      elections: [], // Array to hold multiple elections
    };
  }

  // refreshing once
  componentDidMount = async () => {
    if (!window.location.hash) {
      window.location = window.location + "#loaded";
      window.location.reload();
    }
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the factory contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedFactoryNetwork = ElectionFactory.networks[networkId];
      const factoryInstance = new web3.eth.Contract(
        ElectionFactory.abi,
        deployedFactoryNetwork && deployedFactoryNetwork.address,
      );
      
      this.setState({
        web3: web3,
        ElectionFactoryInstance: factoryInstance,
        account: accounts[0],
      });

      // Get deployed elections from factory
      let deployedElections = await factoryInstance.methods.getDeployedElections().call();
      
      // Ensure deployedElections is an array
      if (!Array.isArray(deployedElections)) {
        deployedElections = [];
      }
      
      // Load details for each election
      const elections = [];
      for (let i = 0; i < deployedElections.length; i++) {
        const electionAddress = deployedElections[i];
        const electionContract = new web3.eth.Contract(Election.abi, electionAddress);
        
        // Get election details
        const electionDetails = await electionContract.methods.getElectionDetails().call();
        
        // Handle case where election details might be empty
        if (!electionDetails.electionTitle) {
          continue; // Skip this election if it doesn't have valid details
        }
        
        // Get election status
        const start = await electionContract.methods.getStart().call();
        const end = await electionContract.methods.getEnd().call();
        
        // Only include elections that have ended
        if (end) {
          elections.push({
            address: electionAddress,
            details: {
              adminName: electionDetails.adminName,
              adminEmail: electionDetails.adminEmail,
              adminTitle: electionDetails.adminTitle,
              electionTitle: electionDetails.electionTitle,
              organizationTitle: electionDetails.organizationTitle,
            },
            started: start,
            ended: end
          });
        }
      }
      
      this.setState({ elections: elections });
      
      // Check if user is admin for any election
      for (let i = 0; i < deployedElections.length; i++) {
        const electionAddress = deployedElections[i];
        const electionContract = new web3.eth.Contract(Election.abi, electionAddress);
        const admin = await electionContract.methods.getAdmin().call();
        if (this.state.account === admin) {
          this.setState({ isAdmin: true });
          break;
        }
      }
    } catch (error) {
      // Catch any errors for any of the above operations.
      console.error(error);
      alert(
        `Failed to load web3, accounts, or contract. Check console for details (f12).`
      );
    }
  };

  render() {
    if (!this.state.web3) {
      const isUserPage = window.location.pathname.startsWith('/user');
      return (
        <>
          {!this.state.isAdmin && !isUserPage ? <Navbar /> : <NavbarAdmin />}
          <div className="container-main">
            <div className="container-item center-items" style={{textAlign: 'center', padding: '4rem 2rem'}}>
              <div className="loading" style={{width: '3rem', height: '3rem', marginBottom: '2rem'}}></div>
              <h2 style={{marginBottom: '1rem'}}>Loading Elections</h2>
              <p style={{color: 'var(--text-secondary)'}}>
                Connecting to Blockchain...
              </p>
            </div>
          </div>
        </>
      );
    }
    
    return (
      <>
        <Navbar />
        <div className="container-main">
          <h3>Election Results</h3>
          <small>View results for completed elections.</small>
          
          {this.state.elections.length === 0 ? (
            <div className="container-item center-items">
              <h3>No completed elections available</h3>
              <p>There are currently no elections with published results.</p>
              <Link to="/elections" className="btn btn-primary">
                View All Elections
              </Link>
            </div>
          ) : (
            <div className="election-list">
              {this.state.elections.map((election, index) => (
                <div key={index} className="container-item election-item">
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                    <h3 style={{margin: 0, color: 'var(--primary-text)'}}>
                      {election.details.electionTitle}
                    </h3>
                    <span className="tag ended">Ended</span>
                  </div>
                  
                  <div style={{marginBottom: '1rem'}}>
                    <p style={{margin: '0.5rem 0', color: 'var(--text-secondary)'}}>
                      <i className="fas fa-building"></i> {election.details.organizationTitle}
                    </p>
                    <p style={{margin: '0.5rem 0', color: 'var(--text-secondary)'}}>
                      <i className="fas fa-user-tie"></i> {election.details.adminName} ({election.details.adminTitle})
                    </p>
                  </div>
                  
                  <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                    <Link 
                      to={`/results/${election.address}`} 
                      className="btn btn-primary"
                      style={{textDecoration: 'none'}}
                    >
                      View Results
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }
}