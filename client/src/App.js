import './App.css';
import {ethers} from 'ethers';
import {useEffect, useState} from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Modal from './Modal.js';

import bankArtifact from './artifacts/contracts/Bank.sol/Bank.json';

import maticArtifact from './artifacts/contracts/Matic.sol/Matic.json';
import shibArtifact from './artifacts/contracts/Shib.sol/Shib.json';
import usdtArtifact from './artifacts/contracts/Usdt.sol/Usdt.json';

function App() {

  const [provider, setProvider] = useState(undefined);
  const [signer, setSigner] = useState(undefined);
  const [signerAddress, setSignerAddress] = useState(undefined);
  const [bankContract, setBankContract] = useState(undefined);
  const [tokenContracts, setTokenContracts] = useState({});
  const [tokenBalances, setTokenBalances] =useState({});
  const [tokenSymbols, setTokenSymbols] = useState({});

  const [amount, setAmount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState(undefined);
  const [isDeposit, setIsDeposit] = useState(true);

  const toByte32 = text=>(ethers.utils.formatBytes32String(text));
  const toString = byte32=>(ethers.utils.parseBytes32String(byte32));
  const toWei = ether=>(ethers.utils.parseEther(ether));
  const toEther = wei =>(ethers.utils.formatEther(wei).toString());
  const toRound = num =>(Number(num).toFixed(2));

  useEffect(()=>{
    const init = async ()=>{
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(provider);

      const bankContract = await new ethers.Contract("0x5FbDB2315678afecb367f032d93F642f64180aa3",bankArtifact.abi);

      setBankContract(bankContract);

      bankContract.connect(provider).getWhitelistedSymbols()
      .then((result)=>{
        const symbols = result.map(symbol =>toString(symbol));
        setTokenSymbols(symbols);
        getTokenContracts(symbols,bankContract, provider);
      },[])

    }
    init();
  });

  const getTokenContract = async (symbol, bankContract, provider) => {
    const address = await bankContract.connect(provider).getWhitelistedTokenAddress(toByte32(symbol));
    const tokenArtifact = symbol==='Matic'? maticArtifact : (symbol==='Shib'? shibArtifact :usdtArtifact);
    const tokenContract = await new ethers.Contract(address,tokenArtifact.abi);

    return tokenContract;
  }

  const getTokenContracts= async (symbols, bankContract, provider) =>{
    symbols.map(symbol =>{
      const tokenContract = getTokenContract(symbol,bankContract, provider);
      setTokenContracts(prev=>({...prev, [symbol]: tokenContract}));
    });
  }

const isConnected = () => (signer!==undefined);
const getSigner = async provider => { 
  await provider.send("eth_requestAccounts",[]);
  const signer = await provider.getSigner();
  console.log(signer);
  signer.getAddress()
  .then(address =>{ 
    console.log(address);
    setSignerAddress(address);
  })
  return signer;
}

const connect = () =>{ 
  
  getSigner(provider)
  .then(signer=>{
    setSigner(signer)
    getTokenBalances(signer)
  });
}

const displayModal = (symbol)=>{
  setSelectedSymbol(symbol);
  setShowModal(true);
}

const depositTokens = (wei, symbol) =>{
  if(symbol === "Eth"){
    signer.sendTransaction({
      to: bankContract.address,
      value: wei
    })
  }
  else{
    const tokenContract = tokenContracts[symbol];
    tokenContract.connect(signer).approve(bankContract.address,wei)
    .then(()=>{
      bankContract.connect(signer).depositTokens(wei, toByte32(symbol));
    })
    
  }
}

const withdrawTOkens=(wei, symbol)=>{
  if(Symbol='Eth'){
    bankContract.connect(signer).withdrawEther(wei)
  }
  else{
    bankContract.connect(signer).withdrawTokens(wei, toByte32(symbol))
  }
}

const depositOrWithdraw = (e, symbol)=>{
  e.preventDefault();
  const wei = toWei(amount)

  if(isDeposit){
    depositTokens(wei,symbol)
  }else{
    withdrawTOkens(wei, symbol)
  }
}
const getTokenBalance = async(symbol,signer)=>{
  const balance = await bankContract.connect(signer).getTokenBalance(toByte32(symbol));
  return toEther(balance);
}

const getTokenBalances = (signer)=>{
  tokenSymbols.map(async(symbol)=>{
    const balance = await getTokenBalance(symbol,signer)
    setTokenBalances(prev=>({...prev,[symbol]:balance.toString()}));
  })
}
return (
  <div className="App">
    <header className="App-header">
      {isConnected() ? (
        <div>
          <p>
            Welcome {signerAddress?.substring(0,10)}...
          </p>
          <div>
            <div className="list-group">
              <div className="list-group-item">
                {Object.keys(tokenBalances).map((symbol, idx) => (
                  <div className=" row d-flex py-3" key={idx}>

                    <div className="col-md-3">
                      <div>{symbol.toUpperCase()}</div>
                    </div>

                    <div className="d-flex gap-4 col-md-3">
                      <small className="opacity-50 text-nowrap">{toRound(tokenBalances[symbol])}</small>
                    </div>

                    <div className="d-flex gap-4 col-md-6">
                      <button onClick={ () => displayModal(symbol) } className="btn btn-primary">Deposit/Withdraw</button>
                      <Modal
                        show={showModal}
                        onClose={() => setShowModal(false)}
                        symbol={selectedSymbol}
                        depositOrWithdraw={depositOrWithdraw}
                        isDeposit={isDeposit}
                        setIsDeposit={setIsDeposit}
                        setAmount={setAmount}
                      />
                    </div>

                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      ):
          (<div>
            <p>You are not connected</p>
            <button onClick={connect} className="btn btn-primary">Connect Metamask</button>
        </div>)
        }
          
      </header>
    </div>
  );
}

export default App;
