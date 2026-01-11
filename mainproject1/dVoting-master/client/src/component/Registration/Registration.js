// Node modules
import React, { Component } from "react";

// Components
import Navbar from "../Navbar/Navigation";
import NavbarAdmin from "../Navbar/NavigationAdmin";
import NotInit from "../NotInit";

// CSS
import "./Registration.css";

// Contract
import getWeb3 from "../../getWeb3";
import Election from "../../contracts/Election.json";

export default class Registration extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ElectionInstance: undefined,
      web3: null,
      account: null,
      isAdmin: false,
      isElStarted: false,
      isElEnded: false,
      voterCount: undefined,
      voterName: "",
      voterPhone: "",
      voterEmail: "",
      voters: [],
      currentVoter: {
        address: undefined,
        name: null,
        phone: null,
        hasVoted: false,
        isVerified: false,
        isRegistered: false,
      },
      electionDetails: {}, // To store election details
      errors: {}, // To store validation errors
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

      // Get the contract instance based on the election address from URL params or route params
      const networkId = await web3.eth.net.getId();
      
      let instance;
      // Check if we're accessing a specific election via URL params or route params
      const urlParams = new URLSearchParams(window.location.search);
      const urlElectionAddress = urlParams.get('address');
      const routeElectionAddress = this.props.match.params.address;
      const electionAddress = urlElectionAddress || routeElectionAddress;
      
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

      // Admin account and verification
      const admin = await this.state.ElectionInstance.methods.getAdmin().call();
      if (this.state.account === admin) {
        this.setState({ isAdmin: true });
      }

      // Get start and end values
      const start = await this.state.ElectionInstance.methods.getStart().call();
      this.setState({ isElStarted: start });
      const end = await this.state.ElectionInstance.methods.getEnd().call();
      this.setState({ isElEnded: end });

      // Get election details
      const electionDetails = await this.state.ElectionInstance.methods.getElectionDetails().call();
      this.setState({ electionDetails });

      // Total number of voters
      const voterCount = await this.state.ElectionInstance.methods
        .getTotalVoter()
        .call();
      this.setState({ voterCount: voterCount });

      // Loading all the voters
      for (let i = 0; i < this.state.voterCount; i++) {
        const voterAddress = await this.state.ElectionInstance.methods
          .voters(i)
          .call();
        const voter = await this.state.ElectionInstance.methods
          .voterDetails(voterAddress)
          .call();
        this.state.voters.push({
          address: voter.voterAddress,
          name: voter.name,
          phone: voter.phone,
          hasVoted: voter.hasVoted,
          isVerified: voter.isVerified,
          isRegistered: voter.isRegistered,
        });
      }
      this.setState({ voters: this.state.voters });

      // Loading current voters
      const voter = await this.state.ElectionInstance.methods
        .voterDetails(this.state.account)
        .call();
      this.setState({
        currentVoter: {
          address: voter.voterAddress,
          name: voter.name,
          phone: voter.phone,
          hasVoted: voter.hasVoted,
          isVerified: voter.isVerified,
          isRegistered: voter.isRegistered,
        },
      });
    } catch (error) {
      // Catch any errors for any of the above operations.
      console.error(error);
      alert(
        `Failed to load web3, accounts, or contract. Check console for details (f12).`
      );
    }
  };
  updateVoterName = (event) => {
    const value = event.target.value;
    this.setState({ voterName: value }, () => {
      this.validateName(value);
    });
  };
  
  updateVoterPhone = (event) => {
    const value = event.target.value;
    this.setState({ voterPhone: value }, () => {
      this.validatePhone(value);
    });
  };
  
  updateVoterEmail = (event) => {
    const value = event.target.value;
    this.setState({ voterEmail: value }, () => {
      this.validateEmail(value);
    });
  };
  
  validateName = (name) => {
    const errors = { ...this.state.errors };
    
    // Remove extra spaces and trim
    const trimmedName = name.trim();
    
    if (trimmedName.length < 3) {
      errors.voterName = "Name should contain at least 3 characters";
    } else if (!/^[A-Za-z\s]+$/.test(trimmedName)) {
      errors.voterName = "Name should contain only letters and spaces";
    } else {
      delete errors.voterName;
    }
    
    this.setState({ errors });
  };
  
  validateEmail = (email) => {
    const errors = { ...this.state.errors };
    
    if (!email) {
      errors.voterEmail = "Email is required";
    } else if (!/^[A-Za-z0-9._%+-]+@gmail\.com$/i.test(email)) {
      errors.voterEmail = "Please enter a valid Gmail address";
    } else {
      delete errors.voterEmail;
    }
    
    this.setState({ errors });
  };
  
  validatePhone = (phone) => {
    const errors = { ...this.state.errors };
    
    if (!phone) {
      errors.voterPhone = "Phone number is required";
    } else if (!/^[0-9]{10}$/.test(phone)) {
      errors.voterPhone = "Enter a valid 10-digit mobile number";
    } else if (!/^[6-9]/.test(phone)) {
      errors.voterPhone = "Enter a valid 10-digit mobile number";
    } else {
      delete errors.voterPhone;
    }
    
    this.setState({ errors });
  };
  
  validateForm = () => {
    const { voterName, voterPhone, voterEmail } = this.state;
    
    this.validateName(voterName);
    this.validatePhone(voterPhone);
    this.validateEmail(voterEmail);
    
    // Check if there are any errors
    return Object.keys(this.state.errors).length === 0;
  };
  registerAsVoter = async () => {
    // Validate form before submission
    if (!this.validateForm() || !this.isValidForm()) {
      alert("Please fix the errors in the form before submitting.");
      return;
    }
    
    try {
      // Register user on blockchain
      await this.state.ElectionInstance.methods
        .registerAsVoter(this.state.voterName.trim(), this.state.voterPhone)
        .send({ from: this.state.account, gas: 1000000 });
      
      // Store user info without key in localStorage
      // Convert phone to string to ensure consistency with login component
      const newUser = {
        name: this.state.voterName.trim(),
        phone: String(this.state.voterPhone),
        email: this.state.voterEmail,
        account: this.state.account
      };
      
      // Get existing registered users or initialize empty array
      const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]");
      
      // Add new user to the list
      registeredUsers.push(newUser);
      
      // Save updated list back to localStorage
      localStorage.setItem("registeredUsers", JSON.stringify(registeredUsers));
      
      // Show success message and redirect to user page
      alert(`Registration successful! You can now participate in the election.`);
      
      // Redirect to user page
      window.location.href = "/user";
    } catch (error) {
      console.error("Registration error:", error);
      alert("Registration failed. Please try again.");
    }
  };
  
  isValidForm = () => {
    const { voterName, voterPhone, voterEmail, errors } = this.state;
    
    // Check if all fields are filled and there are no errors
    return voterName.trim() && 
           voterPhone && 
           voterEmail && 
           !errors.voterName && 
           !errors.voterPhone && 
           !errors.voterEmail;
  };
  render() {
    const hideNavbar = this.props.hideNavbar || false;
    if (!this.state.web3) {
      const isUserPage = window.location.pathname.startsWith('/user');
      return (
        <>
          {!hideNavbar && (this.state.isAdmin && !isUserPage ? <NavbarAdmin /> : <Navbar />)}
          <div className="container-main">
            <div className="container-item center-items" style={{textAlign: 'center', padding: '4rem 2rem'}}>
              <div className="loading" style={{width: '3rem', height: '3rem', marginBottom: '2rem'}}></div>
              <h2 style={{marginBottom: '1rem'}}>Loading Web3, accounts, and contract...</h2>
            </div>
          </div>
        </>
      );
    }
    const isUserPage = window.location.pathname.startsWith('/user');
    return (
      <>
        {!hideNavbar && (this.state.isAdmin && !isUserPage ? <NavbarAdmin /> : <Navbar />)}
        {!this.state.isElStarted && !this.state.isElEnded ? (
          <NotInit />
        ) : (
          <>
            <div className="container-item info">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                <div>
                  <h2 style={{margin: '0 0 0.5rem 0', color: 'var(--info-text)'}}>
                    {this.state.electionDetails.electionTitle}
                  </h2>
                  <p style={{margin: 0, color: 'var(--info-text)'}}>
                    {this.state.electionDetails.organizationTitle}
                  </p>
                </div>
                <div>
                  <p style={{margin: 0, color: 'var(--info-text)', textAlign: 'right'}}>
                    <strong>Administrator:</strong> {this.state.electionDetails.adminName}
                  </p>
                  <p style={{margin: 0, color: 'var(--info-text)', textAlign: 'right'}}>
                    {this.state.electionDetails.adminTitle}
                  </p>
                </div>
              </div>
              <p>Total registered voters: {this.state.voters.length}</p>
            </div>
            <div className="container-main">
              <h3>Registration</h3>
              <small>Register to vote.</small>
              <div className="container-item">
                <form>
                  <div className="form-group">
                    <label htmlFor="name">Full Name</label>
                    <input
                      type="text"
                      className={`form-control ${this.state.errors.voterName ? 'is-invalid' : ''}`}
                      id="name"
                      placeholder="Enter your full name"
                      value={this.state.voterName}
                      onChange={this.updateVoterName}
                    />
                    {this.state.errors.voterName && (
                      <div className="error-message" style={{ color: 'red', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        {this.state.errors.voterName}
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      className={`form-control ${this.state.errors.voterEmail ? 'is-invalid' : ''}`}
                      id="email"
                      placeholder="Enter your Gmail address"
                      value={this.state.voterEmail}
                      onChange={this.updateVoterEmail}
                    />
                    {this.state.errors.voterEmail && (
                      <div className="error-message" style={{ color: 'red', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        {this.state.errors.voterEmail}
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Phone</label>
                    <input
                      type="text"
                      className={`form-control ${this.state.errors.voterPhone ? 'is-invalid' : ''}`}
                      id="phone"
                      placeholder="Enter your phone number"
                      value={this.state.voterPhone}
                      onChange={this.updateVoterPhone}
                    />
                    {this.state.errors.voterPhone && (
                      <div className="error-message" style={{ color: 'red', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        {this.state.errors.voterPhone}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={this.registerAsVoter}
                    className="btn btn-primary"
                    disabled={!this.isValidForm()}
                  >
                    Register
                  </button>
                </form>
              </div>
              <div className="container-item">
                <div className="text-center">
                  <p>Your Ethereum Account Address:</p>
                  <p><strong>{this.state.account}</strong></p>
                </div>
              </div>
            </div>
          </>
        )}
      </>
    );
  }
}