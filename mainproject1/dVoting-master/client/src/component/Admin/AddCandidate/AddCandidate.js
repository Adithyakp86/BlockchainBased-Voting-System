import React, { Component } from "react";

import Navbar from "../../Navbar/Navigation";
import NavbarAdmin from "../../Navbar/NavigationAdmin";

import getWeb3 from "../../../getWeb3";
import Election from "../../../contracts/Election.json";

import AdminOnly from "../../AdminOnly";

import "./AddCandidate.css";

export default class AddCandidate extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ElectionInstance: undefined,
      web3: null,
      accounts: null,
      isAdmin: false,
      header: "",
      logo: null,
      logoPreview: null,
      candidates: [],
      candidateCount: undefined,
      errors: {}, // To store validation errors
    };
  }

  componentDidMount = async () => {
    // refreshing page only once
    if (!window.location.hash) {
      window.location = window.location + "#loaded";
      window.location.reload();
    }

    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      
      let instance;
      // Check if we're accessing a specific election via route params or URL params
      const routeElectionAddress = this.props.match.params.address;
      const urlParams = new URLSearchParams(window.location.search);
      const urlElectionAddress = urlParams.get('address');
      const electionAddress = routeElectionAddress || urlElectionAddress;
      
      if (electionAddress) {
        // Use the specific election address
        instance = new web3.eth.Contract(Election.abi, electionAddress);
      } else {
        // Fallback to the default election contract for backward compatibility
        const deployedNetwork = Election.networks[networkId];
        instance = new web3.eth.Contract(
          Election.abi,
          deployedNetwork && deployedNetwork.address
        );
      }

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({
        web3: web3,
        ElectionInstance: instance,
        account: accounts[0],
      });

      // Total number of candidates
      const candidateCount = await this.state.ElectionInstance.methods
        .getTotalCandidate()
        .call();
      this.setState({ candidateCount: candidateCount });

      const admin = await this.state.ElectionInstance.methods.getAdmin().call();
      if (this.state.account === admin) {
        this.setState({ isAdmin: true });
      }

      // Loading Candidates details
      for (let i = 0; i < this.state.candidateCount; i++) {
        const candidate = await this.state.ElectionInstance.methods
          .candidateDetails(i)
          .call();
        this.state.candidates.push({
          id: candidate.candidateId,
          header: candidate.header,
          slogan: candidate.slogan,
          blockchainId: candidate.candidateId, // Keep track of the original blockchain ID
        });
      }

      this.setState({ candidates: this.state.candidates });
    } catch (error) {
      // Catch any errors for any of the above operations.
      console.error(error);
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`
      );
    }
  };
  updateHeader = (event) => {
    const value = event.target.value;
    this.setState({ header: value }, () => {
      this.validateHeader(value);
    });
  };
  
  validateHeader = (header) => {
    const errors = { ...this.state.errors };
    
    // Remove extra spaces and trim
    const trimmedHeader = header.trim();
    
    if (trimmedHeader.length < 3) {
      errors.header = "Name should contain at least 3 characters";
    } else if (!/^[A-Za-z\s]+$/.test(trimmedHeader)) {
      errors.header = "Name should contain only letters and spaces";
    } else {
      delete errors.header;
    }
    
    this.setState({ errors });
  };
  
  validateForm = () => {
    const { header } = this.state;
    
    this.validateHeader(header);
    
    // Check if there are any errors
    return Object.keys(this.state.errors).length === 0;
  };
  
  isValidForm = () => {
    const { header, errors } = this.state;
    
    // Check if header is filled and there are no errors
    return header.trim() && !errors.header;
  };
  
  handleLogoChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        this.setState({
          logo: file,
          logoPreview: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  addCandidate = async (e) => {
    e.preventDefault(); // Prevent form submission from refreshing the page
    // Use empty string instead of "Logo uploaded" placeholder
    const slogan = "";
    
    // Add candidate to blockchain
    await this.state.ElectionInstance.methods
      .addCandidate(this.state.header, slogan)
      .send({ from: this.state.account, gas: 1000000 });
      
    // Get the updated candidate count to determine the new candidate ID
    const candidateCount = await this.state.ElectionInstance.methods
      .getTotalCandidate()
      .call();
      
    // Save logo to localStorage with candidate ID as key
    if (this.state.logoPreview) {
      const candidateId = candidateCount - 1;
      localStorage.setItem(`candidate_${candidateId}_logo`, this.state.logoPreview);
    }
    
    window.location.reload();
  };

  loadAdded = (candidates) => {
    const renderAdded = (candidate) => {
      // Try to get logo from localStorage using the original blockchain ID
      const logoKey = `candidate_${candidate.blockchainId}_logo`;
      const logoData = localStorage.getItem(logoKey);
      
      return (
        <>
          <div className="container-list success">
            <div
              style={{
                overflow: "hidden", // Remove scrollbars
              }}
            >
              {candidate.id + 1}. <strong>{candidate.header}</strong>
              {logoData && (
                <span style={{ marginLeft: '10px' }}>
                  <img 
                    src={logoData} 
                    alt="Candidate Logo" 
                    style={{ maxWidth: '50px', maxHeight: '50px', verticalAlign: 'middle' }}
                  />
                </span>
              )}
            </div>
          </div>
        </>
      );
    };
    return (
      <div className="container-main" style={{ borderTop: "1px solid" }}>
        <div className="container-item info">
          <center>Candidates List</center>
        </div>
        {candidates.length < 1 ? (
          <div className="container-item alert">
            <center>No candidates added.</center>
          </div>
        ) : (
          <div
            className="container-item"
            style={{
              display: "block",
              backgroundColor: "#DDFFFF",
            }}
          >
            {candidates.map(renderAdded)}
          </div>
        )}
      </div>
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
          <AdminOnly page="Add Candidate Page." />
        </>
      );
    }
    return (
      <>
        {this.state.isAdmin ? <NavbarAdmin /> : <Navbar />}
        <div className="container-main">
          <h2>Add a new candidate</h2>
          <small>Total candidates: {this.state.candidateCount}</small>
          <div className="container-item">
            <form className="form">
              <label className={"label-ac"}>
                Header
                <input
                  className={`input-ac ${this.state.errors.header ? 'is-invalid' : ''}`}
                  type="text"
                  placeholder="eg. Marcus"
                  value={this.state.header}
                  onChange={this.updateHeader}
                />
                {this.state.errors.header && (
                  <div className="error-message" style={{ color: 'red', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    {this.state.errors.header}
                  </div>
                )}
              </label>
              <label className="label-ac">
                Logo
                <input
                  className={"input-ac"}
                  type="file"
                  accept="image/*"
                  onChange={this.handleLogoChange}
                />
                {this.state.logoPreview && (
                  <div className="logo-preview">
                    <img 
                      src={this.state.logoPreview} 
                      alt="Logo Preview" 
                      style={{ maxWidth: '150px', maxHeight: '150px', marginTop: '10px' }}
                    />
                  </div>
                )}
              </label>
              <button
                className="btn-add"
                disabled={!this.isValidForm()}
                onClick={this.addCandidate}
              >
                Add
              </button>
            </form>
          </div>
        </div>
        {this.loadAdded(this.state.candidates)}
      </>
    );
  }
}