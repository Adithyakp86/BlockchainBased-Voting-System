import React, { Component } from "react";

import Navbar from "../../Navbar/Navigation";
import NavbarAdmin from "../../Navbar/NavigationAdmin";

import AdminOnly from "../../AdminOnly";

import getWeb3 from "../../../getWeb3";
import Election from "../../../contracts/Election.json";
import ElectionFactory from "../../../contracts/ElectionFactory.json";

import "./Verification.css";

export default class Registration extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ElectionInstance: undefined,
      ElectionFactoryInstance: undefined,
      account: null,
      web3: null,
      isAdmin: false,
      voterCount: undefined,
      voters: [],
      elections: [], // To store all elections
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

      // Get the contract instances.
      const networkId = await web3.eth.net.getId();
      
      // Main Election contract (for backward compatibility)
      const deployedElectionNetwork = Election.networks[networkId];
      const electionInstance = new web3.eth.Contract(
        Election.abi,
        deployedElectionNetwork && deployedElectionNetwork.address
      );
      
      // ElectionFactory contract
      const deployedFactoryNetwork = ElectionFactory.networks[networkId];
      const factoryInstance = new web3.eth.Contract(
        ElectionFactory.abi,
        deployedFactoryNetwork && deployedFactoryNetwork.address
      );

      // Set web3, accounts, and contracts to the state
      this.setState({ 
        web3, 
        ElectionInstance: electionInstance, 
        ElectionFactoryInstance: factoryInstance,
        account: accounts[0] 
      });

      // Check if user is admin for main election
      const admin = await electionInstance.methods.getAdmin().call();
      if (this.state.account === admin) {
        this.setState({ isAdmin: true });
      }

      // Get deployed elections from factory
      const deployedElections = await factoryInstance.methods.getDeployedElections().call();
      
      // Load details for each election and check for admin rights
      const elections = [];
      for (let i = 0; i < deployedElections.length; i++) {
        const electionAddress = deployedElections[i];
        const electionContract = new web3.eth.Contract(Election.abi, electionAddress);
        
        // Check if user is admin for this election
        const electionAdmin = await electionContract.methods.getAdmin().call();
        if (this.state.account === electionAdmin) {
          this.setState({ isAdmin: true });
        }
        
        // Get election details
        const electionDetails = await electionContract.methods.getElectionDetails().call();
        
        elections.push({
          address: electionAddress,
          contract: electionContract,
          details: {
            adminName: electionDetails.adminName,
            adminEmail: electionDetails.adminEmail,
            adminTitle: electionDetails.adminTitle,
            electionTitle: electionDetails.electionTitle,
            organizationTitle: electionDetails.organizationTitle,
          }
        });
      }
      
      this.setState({ elections });

      // Load voters from all elections where user is admin
      let allVoters = [];
      
      // Load voters from main election if user is admin
      if (this.state.account === admin) {
        const voterCount = await electionInstance.methods.getTotalVoter().call();
        for (let i = 0; i < voterCount; i++) {
          const voterAddress = await electionInstance.methods.voters(i).call();
          const voter = await electionInstance.methods.voterDetails(voterAddress).call();
          allVoters.push({
            address: voter.voterAddress,
            name: voter.name,
            phone: voter.phone,
            hasVoted: voter.hasVoted,
            isVerified: voter.isVerified,
            isRegistered: voter.isRegistered,
            electionAddress: deployedElectionNetwork && deployedElectionNetwork.address,
            electionTitle: "Main Election" // Default title for main election
          });
        }
      }
      
      // Load voters from factory-created elections where user is admin
      for (let i = 0; i < elections.length; i++) {
        const election = elections[i];
        const electionAdmin = await election.contract.methods.getAdmin().call();
        
        if (this.state.account === electionAdmin) {
          const voterCount = await election.contract.methods.getTotalVoter().call();
          for (let j = 0; j < voterCount; j++) {
            const voterAddress = await election.contract.methods.voters(j).call();
            const voter = await election.contract.methods.voterDetails(voterAddress).call();
            allVoters.push({
              address: voter.voterAddress,
              name: voter.name,
              phone: voter.phone,
              hasVoted: voter.hasVoted,
              isVerified: voter.isVerified,
              isRegistered: voter.isRegistered,
              electionAddress: election.address,
              electionTitle: election.details.electionTitle
            });
          }
        }
      }
      
      this.setState({ voters: allVoters });
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`
      );
      console.error(error);
    }
  };
  
  verifyVoter = async (verifiedStatus, voterAddress, electionAddress) => {
    try {
      let electionContract;
      
      // Determine which contract to use
      if (electionAddress === (await this.state.ElectionInstance?._address)) {
        electionContract = this.state.ElectionInstance;
      } else {
        // Find the correct election contract from our elections array
        const election = this.state.elections.find(e => e.address === electionAddress);
        if (election) {
          electionContract = election.contract;
        } else {
          // Fallback to main election contract
          electionContract = this.state.ElectionInstance;
        }
      }
      
      if (electionContract) {
        await electionContract.methods
          .verifyVoter(verifiedStatus, voterAddress)
          .send({ from: this.state.account, gas: 1000000 });
        window.location.reload();
      }
    } catch (error) {
      console.error("Verification error:", error);
      alert("Verification failed. Please try again.");
    }
  };

  renderUnverifiedVoters = (voter) => {
    return (
      <>
        {voter.isVerified ? (
          <div className="container-list success">
            <p style={{ margin: "7px 0px" }}>AC: {voter.address}</p>
            <table>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Voted</th>
                <th>Election</th>
              </tr>
              <tr>
                <td>{voter.name}</td>
                <td>{voter.phone}</td>
                <td>{voter.hasVoted ? "True" : "False"}</td>
                <td>{voter.electionTitle}</td>
              </tr>
            </table>
          </div>
        ) : null}
        <div
          className="container-list attention"
          style={{ display: voter.isVerified ? "none" : null }}
        >
          <table>
            <tr>
              <th>Account address</th>
              <td>{voter.address}</td>
            </tr>
            <tr>
              <th>Name</th>
              <td>{voter.name}</td>
            </tr>
            <tr>
              <th>Phone</th>
              <td>{voter.phone}</td>
            </tr>
            <tr>
              <th>Voted</th>
              <td>{voter.hasVoted ? "True" : "False"}</td>
            </tr>
            <tr>
              <th>Verified</th>
              <td>{voter.isVerified ? "True" : "False"}</td>
            </tr>
            <tr>
              <th>Registered</th>
              <td>{voter.isRegistered ? "True" : "False"}</td>
            </tr>
            <tr>
              <th>Election</th>
              <td>{voter.electionTitle}</td>
            </tr>
          </table>
          <div style={{}}>
            <button
              className="btn-verification approve"
              disabled={voter.isVerified}
              onClick={() => this.verifyVoter(true, voter.address, voter.electionAddress)}
            >
              Approve
            </button>
          </div>
        </div>
      </>
    );
  };
  
  render() {
    if (!this.state.web3) {
      return (
        <>
          {this.state.isAdmin ? <NavbarAdmin /> : <Navbar />}
          <center>Loading Web3, accounts, and contract...</center>
        </>
      );
    }
    if (!this.state.isAdmin) {
      return (
        <>
          {this.state.isAdmin ? <NavbarAdmin /> : <Navbar />}
          <AdminOnly page="Verification Page." />
        </>
      );
    }
    return (
      <>
        {this.state.isAdmin ? <NavbarAdmin /> : <Navbar />}
        <div className="container-main">
          <h3>Verification</h3>
          <small>Total Voters: {this.state.voters.length}</small>
          {this.state.voters.length < 1 ? (
            <div className="container-item info">None has registered yet.</div>
          ) : (
            <>
              <div className="container-item info">
                <center>List of registered voters</center>
              </div>
              {this.state.voters.map(this.renderUnverifiedVoters)}
            </>
          )}
        </div>
      </>
    );
  }
}