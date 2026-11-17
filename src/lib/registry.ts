// Every stock token ANGELUS follows, with the venues it trades on.
// Token addresses are used for live prices (DexScreener); pool addresses are the
// deepest USD pool per chain and are used for hourly history (GeckoTerminal).

export type ChainId = "robinhood" | "solana" | "ethereum";

export interface Venue {
  token: string;
  pool: string;
  issuer: string;
}

export interface Listing {
  ticker: string;
  name: string;
  venues: Partial<Record<ChainId, Venue>>;
}

export const CHAINS: Record<ChainId, { label: string; short: string; explorer: string }> = {
  robinhood: { label: "Robinhood Chain", short: "RH", explorer: "https://dexscreener.com/robinhood/" },
  solana: { label: "Solana", short: "SOL", explorer: "https://dexscreener.com/solana/" },
  ethereum: { label: "Ethereum", short: "ETH", explorer: "https://dexscreener.com/ethereum/" },
};

const rh = (token: string, pool: string): Venue => ({ token, pool, issuer: "Robinhood" });
const xs = (token: string, pool: string): Venue => ({ token, pool, issuer: "xStocks" });
const on = (token: string, pool: string): Venue => ({ token, pool, issuer: "Ondo" });

export const LISTINGS: Listing[] = [
  {
    ticker: "NVDA",
    name: "NVIDIA",
    venues: {
      robinhood: rh("0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC", "0xd4EB21209C4D6093f80B5b84f5C45cc093EA14a3"),
      solana: xs("Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh", "49iMatQtoyabsYAQc8GafVq6aeBFVDxSRH44oiatyyw6"),
      ethereum: on("0x2D1F7226Bd1F780AF6B9A49DCC0aE00E8Df4bDEE", "0x6eE97deA63C77D1aeE3f403BFF4aD1dEF3Fb6683"),
    },
  },
  {
    ticker: "TSLA",
    name: "Tesla",
    venues: {
      robinhood: rh("0x322F0929c4625eD5bAd873c95208D54E1c003b2d", "0xf4ACdAEEB7022862A763C9B1B885e11191c889E3"),
      solana: xs("XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB", "8aDaBQkTrS6HVMjyc6EZebgdiaXhLYGriDWKWWp1NpFF"),
      ethereum: on("0xf6b1117ec07684D3958caD8BEb1b302bfD21103f", "0xF2006D44339E5C2c479d450a97884d4E20D028AD"),
    },
  },
  {
    ticker: "AAPL",
    name: "Apple",
    venues: {
      robinhood: rh("0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9", "0xc748f4671a867db48b552f6b7650bf3255e05f80f00e3f7aad1b17ccb7898fdb"),
      solana: xs("XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp", "CKwJZwm7oj3nu4653N1EpDrqXbXAYXoPFiPeEnLouF8y"),
      ethereum: on("0x14c3abF95Cb9C93a8b82C1CdCB76D72Cb87b2d4c", "0xad82C9EB065a5CFed71DB087e4a52C8a09c69921"),
    },
  },
  {
    ticker: "MSFT",
    name: "Microsoft",
    venues: {
      robinhood: rh("0xe93237C50D904957Cf27E7B1133b510C669c2e74", "0xeb60bCD1D920ad6E102690CCFC6fB488899E1510"),
      solana: xs("XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX", "D6bRhQUcR9B7bPbbqgxpE17MjyUjBtr8hHQCcJoHrrv1"),
      ethereum: on("0xB812837b81a3a6b81d7CD74CfB19A7f2784555E5", "0xb97c30485cfdb895a811331e2a3aab1233a5bf8ff27b6be149edbdc7e9a37333"),
    },
  },
  {
    ticker: "AMZN",
    name: "Amazon",
    venues: {
      robinhood: rh("0x12f190a9F9d7D37a250758b26824B97CE941bF54", "0x8AC92DA74AB5F3b1d024Dc1943Ad7e15Dc4179Ef"),
      solana: xs("Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg", "6m5aXAve4uh6Kt4ytKyCLWNMjd8PYP5vujwNCtycrUiD"),
      ethereum: on("0xbb8774FB97436d23d74C1b882E8E9A69322cFD31", "0x267d70816c37d531818dfe2224a1e5beac46fe74929f2370433c1918facb3a8d"),
    },
  },
  {
    ticker: "META",
    name: "Meta Platforms",
    venues: {
      robinhood: rh("0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35", "0x5875d407a42965b0e768c8925cea290e06fa50603ef34fc99eb92a1050e6ae36"),
      solana: xs("Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu", "3L7KbPVaAQA4UTecaGQYsm6UCq5F3sZM9zAYkxqYt63j"),
      ethereum: on("0x59644165402b611b350645555B50Afb581C71EB2", "0x6692291A3d1bA9532C9d3Df049d4c7c058F796e2"),
    },
  },
  {
    ticker: "GOOGL",
    name: "Alphabet",
    venues: {
      robinhood: rh("0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3", "0x34D0dC122CF9A8Eb296fC5e0D3A233625D7d19b7"),
      solana: xs("XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN", "B8YAwjGYk6qidWzGBXMAxP7nYfG8g74EZ3Y4gFSsobRw"),
      ethereum: on("0xbA47214eDd2bb43099611b208f75E4b42FDcfEDc", "0x39FCB1935f6Ccb0A106D05eB928205C59646af57"),
    },
  },
  {
    ticker: "AMD",
    name: "Advanced Micro Devices",
    venues: {
      robinhood: rh("0x86923f96303D656E4aa86D9d42D1e57ad2023fdC", "0xde9f85fdd9e05a943a52f2c69ffafe3064a3287df03d02c9b431bc92d4781274"),
    },
  },
  {
    ticker: "PLTR",
    name: "Palantir",
    venues: {
      robinhood: rh("0x894E1EC2D74FFE5AEF8Dc8A9e84686acCB964F2A", "0xee430ee1003e1985e1828a01b9a20dad67ad4302994fe2abb4a173de4ac54623"),
      solana: xs("XsoBhf2ufR8fTyNSjqfU71DYGaE6Z3SUGAidpzriAA4", "5bY2fh9rgTYaBDxFGFJmddhaDkm5zwiWP6b2ZsjJZyP"),
      ethereum: on("0x0c666485b02F7A87d21AdD7AEb9F5e64975AA490", "0x105acD9eC97a5fb86e9440eca11246005DDE0517"),
    },
  },
  {
    ticker: "COIN",
    name: "Coinbase",
    venues: {
      robinhood: rh("0x6330D8C3178a418788dF01a47479c0ce7CCF450b", "0x007a13fa152f6dc383cad20a8eaab4e1e2538b606936eae2a424f8aa47d6db31"),
      solana: xs("Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu", "w7SGmPeXoMCsjvXqgsAmUn56uypyDsjAtsxeVkaiqxa"),
    },
  },
  {
    ticker: "MSTR",
    name: "Strategy",
    venues: {
      robinhood: rh("0xec262a75e413fAfD0dF80480274532C79D42da09", "0x319bac87e616a89e241c10aeb8afd4892a852cdd8b373cd9765ecddc40b87cfe"),
      solana: xs("XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ", "RyhF4cksVZY7vcqJpoytHcxcGNKRp27PEGhSnEPpbGv"),
    },
  },
  {
    ticker: "CRCL",
    name: "Circle",
    venues: {
      robinhood: rh("0xdF0992E440dD0be65BD8439b609d6D4366bf1CB5", "0x654E4143e82a5824445Ade0824351C2A9ACD95a8"),
      solana: xs("XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1", "GYqHjuDzTiw7i52Xv1qohDE6eJr6eSZpsrBVikGZyaFV"),
    },
  },
  {
    ticker: "NFLX",
    name: "Netflix",
    venues: {
      robinhood: rh("0xE0444EF8BF4eD74f74FD73686e2ddF4C1c5591E8", "0x59895C0302F41aEaa129D2fa2442CEc01E7eF45E"),
    },
  },
  {
    ticker: "AVGO",
    name: "Broadcom",
    venues: {
      robinhood: rh("0x156E175DD063a8cE274C50654eF40e0032b3fbcF", "0x5B7C404f1d7d77F9f3885aB13d7764F8a173028c"),
    },
  },
  {
    ticker: "SPY",
    name: "S&P 500 ETF",
    venues: {
      robinhood: rh("0x117cc2133c37B721F49dE2A7a74833232B3B4C0C", "0xfe2a80bb5618fd14984b92ca6d45bf5ba67443ddb1435e28b2e48df2fc1526cd"),
      solana: xs("XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W", "6truu3rZuiB9rKQg4VYC3Dt3QwV7DgwGqXrYUcrvnDDE"),
      ethereum: on("0xFeDC5f4a6c38211c1338aa411018DFAf26612c08", "0x5638bbDE046EC2EFC7C8f3fd8DC5A9A1016f7EEB"),
    },
  },
  {
    ticker: "QQQ",
    name: "Nasdaq-100 ETF",
    venues: {
      robinhood: rh("0xD5f3879160bc7c32ebb4dC785F8a4F505888de68", "0xD60A5d14dB690B7Afad71F76B108071D7175597d"),
      solana: xs("Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ", "GMjGLWzvK75LPetrgAmdeXnvxc4fUuQPwJxeQqTDU1aG"),
    },
  },
];

export const TICKERS = LISTINGS.map((l) => l.ticker);
export const INDEX_TICKER = "SPY";

export function listing(ticker: string): Listing | undefined {
  return LISTINGS.find((l) => l.ticker === ticker.toUpperCase());
}
