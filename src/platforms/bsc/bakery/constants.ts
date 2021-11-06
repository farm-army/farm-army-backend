import BigNumber from "bignumber.js/bignumber";

enum ChainId {
    MAINNET = 1,
    ROPSTEN = 3,
    RINKEBY = 4,
    GÖRLI = 5,
    KOVAN = 42,
    BSC_MAINNET = 56,
    BSC_TESTNET = 97
}

// mint token
export const MINTTOKEN = Object.freeze({
    ALLNEW: 'ALLNEW',
    ENDED: 'ENDED',
    BAKE: 'BAKE',
    PET: 'PET',
    BPET: 'BPET',
    WEAPON: 'WEAPON',
    BEST: 'BEST',
    WEAPONNFT: 'WEAPONNFT',
    PETNFT: 'PETNFT',
    HELMETNFT: 'HELMETNFT',
    HATNFT: 'HATNFT',
    ETH2MASTER: 'ETH2MASTER',
    AETHANDETH2: 'AETHANDETH2',
    AETHMASTER: 'AETHMASTER',
    TEN: 'TEN',
    TENNFT: 'TENNFT',
    WSOTE: 'WSOTE',
    SHIELD: 'SHIELD',
    BRY: 'BRY',
    BAKESTAKING: 'BAKESTAKING',
    DEFI100: 'DEFI100',
    DEFI100OLD: 'DEFI100OLD',
    BANANA: 'BANANA',
    PCWS: 'PCWS',
    SEASCAPENFT: 'SEASCAPENFT',
    WAR: 'WAR',
    TKONFT: 'TKONFT',
    WAR2: 'WAR2',
    DIESEL: 'DIESEL',
    MX: 'MX'
})

export const SUBTRACT_GAS_LIMIT = 100000

const ONE_MINUTE_IN_SECONDS = new BigNumber(60)
const ONE_HOUR_IN_SECONDS = ONE_MINUTE_IN_SECONDS.times(60)
const ONE_DAY_IN_SECONDS = ONE_HOUR_IN_SECONDS.times(24)
const ONE_YEAR_IN_SECONDS = ONE_DAY_IN_SECONDS.times(365)

export const INTEGERS = {
    ONE_MINUTE_IN_SECONDS,
    ONE_HOUR_IN_SECONDS,
    ONE_DAY_IN_SECONDS,
    ONE_YEAR_IN_SECONDS,
    ZERO: new BigNumber(0),
    ONE: new BigNumber(1),
    ONES_31: new BigNumber('4294967295'), // 2**32-1
    ONES_127: new BigNumber('340282366920938463463374607431768211455'), // 2**128-1
    ONES_255: new BigNumber('115792089237316195423570985008687907853269984665640564039457584007913129639935'), // 2**256-1
    INTEREST_RATE_BASE: new BigNumber('1e18')
}


export const deadAddress = '0x000000000000000000000000000000000000dead'

export const contractAddresses = {
    bakeBatBlp: {
        [ChainId.BSC_TESTNET]: '0xF1785c979E822134b6D5A9B23Bd75126388B23Df',
        [ChainId.BSC_MAINNET]: '0x675Ec26cF1c99A5cD227658f5d0e2fAcbbf3Dcf7'
    },
    oneInchBakeNFT: {
        [ChainId.BSC_TESTNET]: '0xb4484CACd4cdA038B7d7b261502E5cdFBab9eb5B',
        [ChainId.BSC_MAINNET]: '0x2B843942EdF0040012b12bE2b3C197Ef53cab7F9'
    },
    exchangeOneInchBakeNFT: {
        [ChainId.BSC_TESTNET]: '0x1753091b502B797B8b545aE890AD2936A7588696',
        [ChainId.BSC_MAINNET]: '0x961985030bC6cB35a8bf2bfeFf32FF0512f4D3b0'
    },
    bidOneInchBakeNFT: {
        [ChainId.BSC_TESTNET]: '0xEF8806D4Ff16Cc555E2C693a1795CdC0d00B7727',
        [ChainId.BSC_MAINNET]: '0xea8683ed461ED504F08078903C2C89ee5F40A8A7'
    },
    busd: {
        [ChainId.BSC_TESTNET]: '0xed24fc36d5ee211ea25a80239fb8c4cfd80f12ee',
        [ChainId.BSC_MAINNET]: '0xe9e7cea3dedca5984780bafc599bd69add087d56'
    },
    busdUsdcBlp: {
        [ChainId.BSC_TESTNET]: '0xA29122631a683EeFe5696F678e9DDbFA5415a537',
        [ChainId.BSC_MAINNET]: '0x56CDE265aaD310e623C8f8994a5143582659aBfC'
    },
    mx: {
        [ChainId.BSC_TESTNET]: '0x54991a494a05C2435E73C34782b8cCF954c77099',
        [ChainId.BSC_MAINNET]: '0x9F882567A62a5560d147d64871776EeA72Df41D3'
    },
    bakeMxBlp: {
        [ChainId.BSC_TESTNET]: '0x22ca1a9ac0c9393b86f4097b7bd9d003cb12acf2',
        [ChainId.BSC_MAINNET]: '0x0af49D51E2136af95646527263bACbA004eb4884'
    },
    mxMaster: {
        [ChainId.BSC_TESTNET]: '0x7469A0B95FF8649bCcfa9d10F8D7e01DbEF9791f',
        [ChainId.BSC_MAINNET]: '0xBF94CC0BbE177C6E0d2d581cA20dcF7CBd50B8f4'
    },
    diesel: {
        [ChainId.BSC_TESTNET]: '0x398F3AC457a965493C7D9E35158Ab716A40Edd76',
        [ChainId.BSC_MAINNET]: '0xe1eA2E1907d93F154234CE3b5A7418faf175fE11'
    },
    dieselMaster: {
        [ChainId.BSC_TESTNET]: '0x5f44f198115E0e856440473620c44E5Ceb267306',
        [ChainId.BSC_MAINNET]: '0xA3138cF6AA7ac5F6D27adFf863D92d5717a47402'
    },
    bnbDieselBlp: {
        [ChainId.BSC_TESTNET]: '0xc09D61E531Acbc58c66F22Cf8265bD5061A0cEd8',
        [ChainId.BSC_MAINNET]: '0x2077bB2BAbf6e78dE2825143a1C03AbFe974DbeA'
    },
    voteForNFT: {
        [ChainId.BSC_TESTNET]: '0x87CAdb6185EcFb54E6bd46541581D727d497E0F5',
        [ChainId.BSC_MAINNET]: '0xdCb42F9b544312aBdC9c6145a9F0Af590e4b535E'
    },
    tokocryptoNft: {
        [ChainId.BSC_TESTNET]: '0x3A1c331Bb2cBA92F3F623068947bAbAE3ed99A36',
        [ChainId.BSC_MAINNET]: '0x3A1c331Bb2cBA92F3F623068947bAbAE3ed99A36'
    },
    tokocryptoCommonNftMaster: {
        [ChainId.BSC_TESTNET]: '0x9E5aB10f4d9Fac4fA8B4306C7d115fBcaC3869da',
        [ChainId.BSC_MAINNET]: '0x5466Bbb3c6280943C8A9b0c39e3ad7D31b2bB78D'
    },
    exchangeTokocryptoNFT: {
        [ChainId.BSC_TESTNET]: '0xA2734393C1b8880aEF94026699F4eCcCc8dC89AC',
        [ChainId.BSC_MAINNET]: '0xcfb27c7F778780178e95feA84c45e5D79F0a0a4E'
    },
    bidTokocryptoNFT: {
        [ChainId.BSC_TESTNET]: '0xCA8e8E83856758b01488d904e5aBE85d21d743EF',
        [ChainId.BSC_MAINNET]: '0xE4D3299B1a3C268814C57394c2a729FecA3b2B00'
    },
    war: {
        [ChainId.BSC_TESTNET]: '0x9f0D3d71a1C58a1025701929Be99D23B3eA7e607',
        [ChainId.BSC_MAINNET]: '0x42dbD44a8883D4363B395F77547812DC7dB806d5'
    },
    bakeWarBlp: {
        [ChainId.BSC_TESTNET]: '0x2759a262108Ca345e1F40F13774040ec8Be9Eeb6',
        [ChainId.BSC_MAINNET]: '0x8B4Fa3e7F29924b6A60C4abaC0db9dEA0DF594ba'
    },
    warMaster: {
        [ChainId.BSC_TESTNET]: '0x7bf4bed035a54589082b73a5d6e41413da981f09',
        [ChainId.BSC_MAINNET]: '0x52c26308fe70fd188c7efaad11663e5b3ead42c9'
    },
    busdWarBlp: {
        [ChainId.BSC_TESTNET]: '0xf08957d003208a23508fe9054fafd7217c789825',
        [ChainId.BSC_MAINNET]: '0x083593735495EE0EB7D8716470D7683c1b852ca5'
    },
    warMaster2: {
        [ChainId.BSC_TESTNET]: '0x35750aFd872FB6fFCD5c7DCe8904f8edD9a129Ce',
        [ChainId.BSC_MAINNET]: '0x77Bfd5d645010F5d798a3a481E122eC8F291eDCE'
    },
    seascapeNFT: {
        [ChainId.BSC_TESTNET]: '0x66638f4970c2ae63773946906922c07a583b6069',
        [ChainId.BSC_MAINNET]: '0xc54b96b04AA8828b63Cf250408E1084E9F6Ac6c8'
    },
    seascapeCommonNftMaster: {
        [ChainId.BSC_TESTNET]: '0xd7292499CC94016c4265Af49034e58018399151E',
        [ChainId.BSC_MAINNET]: '0xA491395865cA3Ef828E4a879D3d2de7C7eC94689'
    },
    pCWSBakeBlp: {
        [ChainId.BSC_TESTNET]: '0x8c72CbDaCb26f15e1a73D78dE1265C963ACed502',
        [ChainId.BSC_MAINNET]: '0x14BC29C27899E33fdD7169407216C86Fa947c537'
    },
    exchangeSeascapeNFT: {
        [ChainId.BSC_TESTNET]: '0x196a6D38b0048aC41c3819476177fCC22d3ec081',
        [ChainId.BSC_MAINNET]: '0x773028cD87f93dfA67E2F5FeC01DB4EA82Cc4b07'
    },
    bidSeascapeNFT: {
        [ChainId.BSC_TESTNET]: '0xb8737421ab10EeDB01F1d7c30c5ad5F0ebB6Afb5',
        [ChainId.BSC_MAINNET]: '0x498a5E8A34A85845DeD8869d5638B2E2ff91D979'
    },
    pCWSBnbBlp: {
        [ChainId.BSC_TESTNET]: '0x4353A4E7eC5836Fc798308555e153765fA7Ee1B5',
        [ChainId.BSC_MAINNET]: '0xe67B96a9456E6e623463d022Fbb949a3fdD9Ed4C'
    },
    pCWS: {
        [ChainId.BSC_TESTNET]: '0xE17626fC6C189640057Aa4b7fFb272CB7E3A4ea7',
        [ChainId.BSC_MAINNET]: '0xbcf39F0EDDa668C58371E519AF37CA705f2bFcbd'
    },
    pCWSMaster: {
        [ChainId.BSC_TESTNET]: '0xdC2df521fBe550446F0C0e8d98f2C01eb781b0cd',
        [ChainId.BSC_MAINNET]: '0x540360fF1B002aFEd972cFFcB05B6ff478Ca05C2'
    },
    BANANA: {
        [ChainId.BSC_TESTNET]: '0x3D66334d92A00e5Ca199682C67d166Ffee1DB928',
        [ChainId.BSC_MAINNET]: '0x603c7f932ED1fc6575303D8Fb018fDCBb0f39a95'
    },
    bakeBananaBlp: {
        [ChainId.BSC_TESTNET]: '0xA0acf95c4A3a89A6e0b219eb895DF065c48983B5',
        [ChainId.BSC_MAINNET]: '0x61890bd5AF37A44f15a697f9db9BfcCeAbF4e322'
    },
    BANANAMaster: {
        [ChainId.BSC_TESTNET]: '0x5b588A2061441832fF654b513Dd3a3fDc5dbB685',
        [ChainId.BSC_MAINNET]: '0x35dafafE18B65cEBA36350DCf4EeB618Ad2B8387'
    },
    crudeoilBakeBaseIDO: {
        [ChainId.BSC_TESTNET]: '0x3deB2265C986d34532C699abb911AD0c3e837E49',
        [ChainId.BSC_MAINNET]: '0xD2dbbE23baa58e3D56eBd388CfF6791B560F2347'
    },
    spartanBakeBaseIDO: {
        [ChainId.BSC_TESTNET]: '0x09C9177EAe955ccFC9dED783C5886086D30621c0',
        [ChainId.BSC_MAINNET]: '0x67F633FfBB430551893EB2B8e63D211c2B386CC9'
    },
    bidBakeryArtwork3NFT: {
        [ChainId.BSC_TESTNET]: '0x0CE4128c061708718c1a519c11d31d80F297cf9b',
        [ChainId.BSC_MAINNET]: '0xe98631Ce5ccf1e9eF1638a76C78702a384A79E29'
    },
    bakeryArtwork3NFT: {
        [ChainId.BSC_TESTNET]: '0x241DDDC8fa9628923761D94779778288E69C9209',
        [ChainId.BSC_MAINNET]: '0x84d7FE5D949eA5fec5D84617bAdD7590275bFa72'
    },
    exchangeBakeryArtwork3NFT: {
        [ChainId.BSC_TESTNET]: '0x73BD5E9FD21b53BDb455689feA4b03cba0Ffa2E6',
        [ChainId.BSC_MAINNET]: '0x8fb398BE7ACb7110436749A394e3D672b8Ddb2ff'
    },
    DEFI100: {
        [ChainId.BSC_TESTNET]: '0x34EE4d1dDD4DE53958BfC562EB7D9b7B4c8fedAb',
        [ChainId.BSC_MAINNET]: '0x9d8AAC497A4b8fe697dd63101d793F0C6A6EEbB6'
    },
    DEFI100Master: {
        [ChainId.BSC_TESTNET]: '0xA71024785a10786D45ab3F82062ef704aD763355',
        [ChainId.BSC_MAINNET]: '0xf5Df2D28309095c5212F395A4B571cAcE5C2058C'
    },
    DEFI100OldMaster: {
        [ChainId.BSC_TESTNET]: '0xA71024785a10786D45ab3F82062ef704aD763355',
        [ChainId.BSC_MAINNET]: '0x4302b66b1b923171FBF44AeA0ee5a21e687409eC'
    },
    DEFI100BakeBLP: {
        [ChainId.BSC_TESTNET]: '0x05864D0bda90113Bb300355c6726a96d8f97Be0a',
        [ChainId.BSC_MAINNET]: '0x237E5251371A9Ce542829a8888B9C3BF05F68522'
    },
    DEFI100BnbBLP: {
        [ChainId.BSC_TESTNET]: '0x9872624A2b6B7c6444AAa1681146A700d4Fc00a7',
        [ChainId.BSC_MAINNET]: '0x6ba40C79C2Da5d6faF29B1eDac8C15e1fb8f7aB1'
    },
    aeth: {
        [ChainId.BSC_TESTNET]: '0xe82ec65D01E3866c906B608234dd6873C7bbCf73',
        [ChainId.BSC_MAINNET]: '0x973616ff3b9d8F88411C5b4E6F928EE541e4d01f'
    },
    ankr: {
        [ChainId.BSC_TESTNET]: '0x0C3393DB8B57aF9AE636E502C728E5b3c24c1Ab8',
        [ChainId.BSC_MAINNET]: '0xf307910A4c7bbc79691fD374889b36d8531B08e3'
    },
    onx: {
        [ChainId.BSC_TESTNET]: '0xcD73CcDE7d66768d0f64528762CdebE72d198f36',
        [ChainId.BSC_MAINNET]: '0x50dfd52c9f6961Bf94D1d5489AE4B3e37D2F1fe7'
    },
    aethMaster: {
        [ChainId.BSC_TESTNET]: '0x15559497E14E2BB948dE402Fd75627fab3CE88e0',
        [ChainId.BSC_MAINNET]: '0xed8732d98ADb5591e9FC9a15BbA7a345B78B3e0E'
    },
    BRYBakeBLP: {
        [ChainId.BSC_TESTNET]: '0x7508a0Cb9F432B2Fd4ffCD5a2632144A990935b2',
        [ChainId.BSC_MAINNET]: '0x79249E6b65030902671c5Fa85d79E3ec28e4b1b9'
    },
    BRY: {
        [ChainId.BSC_TESTNET]: '0x205E58A7b8B2D37e153b5217feB754967586E91e',
        [ChainId.BSC_MAINNET]: '0xf859Bf77cBe8699013d6Dbc7C2b926Aaf307F830'
    },
    BRYMaster: {
        [ChainId.BSC_TESTNET]: '0xe29B3775425F8EC90db14dA9c53a08BC0235ce7A',
        [ChainId.BSC_MAINNET]: '0xA9E34CB291B64d3ad56B365ADDE369f3Ec04F7a8'
    },
    SHIELD: {
        [ChainId.BSC_TESTNET]: '0x5Bae754F693af19aCfAcf6cb2F4b8F592b68f8AA',
        [ChainId.BSC_MAINNET]: '0x60b3BC37593853c04410c4F07fE4D6748245BF77'
    },
    SHIELDMaster: {
        [ChainId.BSC_TESTNET]: '0xc86c91C0120cd1cFDb4513A9b49F34F0dD4d4A2e',
        [ChainId.BSC_MAINNET]: '0x9C94E850DB4371B38c00F60F9cE111694b212C30'
    },
    wSOTE: {
        [ChainId.BSC_TESTNET]: '0xB939376da0b3C7f47f320580CbB6B2608DB20F58',
        [ChainId.BSC_MAINNET]: '0x541e619858737031a1244a5d0cd47e5ef480342c'
    },
    wSOTEMaster: {
        [ChainId.BSC_TESTNET]: '0x63A535209D8A6c01D5e382f982aFa062a45b233d',
        [ChainId.BSC_MAINNET]: '0x99638fD577C22fc752B3734103933CF9835C5e02'
    },
    wSoteBakeBLP: {
        [ChainId.BSC_TESTNET]: '0x511b69183ee7e983afdc0a48e33310008ee88d20',
        [ChainId.BSC_MAINNET]: '0x7dbc5d1f167b476e7c8866d6e8221d210547ab88'
    },
    ten: {
        [ChainId.BSC_TESTNET]: '0x81fe632De52041d1c7E6C23a42B215a601a7D716',
        [ChainId.BSC_MAINNET]: '0xdFF8cb622790b7F92686c722b02CaB55592f152C'
    },
    tenMaster: {
        [ChainId.BSC_TESTNET]: '0xCB3491E145f78C1d8350B50AA4298a16e310D90A',
        [ChainId.BSC_MAINNET]: '0x4D6D2e3B419D324b77dDCAf3Ff17A66C7D16e9f5'
    },
    tenPetNftMaster: {
        [ChainId.BSC_TESTNET]: '0x99fe3638286499cf0e35Cea3abd83b7677cE2c55',
        [ChainId.BSC_MAINNET]: '0x7c9378d17534a476d8741f26a46cbae1a0788bd5'
    },
    tenBakeBLP: {
        [ChainId.BSC_TESTNET]: '0x6276658502bB1660BCd815B7e1004C041547963D',
        [ChainId.BSC_MAINNET]: '0x101E83700c5dE0Bc4F5a65471A26DA6B141EA478'
    },
    beth: {
        [ChainId.BSC_TESTNET]: '0x747c58A36Fe414032072d671ccdf38720aDDb1a9',
        [ChainId.BSC_MAINNET]: '0x250632378E573c6Be1AC2f97Fcdf00515d0Aa91B'
    },
    bethBakeBLP: {
        [ChainId.BSC_TESTNET]: '0xfef3ec19d4b48c9d75684c2ca7527b9ddbae53fe',
        [ChainId.BSC_MAINNET]: '0x53920d115CeC3E94dFeae52CA515093e84858109'
    },
    eth2Master: {
        [ChainId.BSC_TESTNET]: '0x377C901Dc5f752C110dB33A526cAA327454F5Cf0',
        [ChainId.BSC_MAINNET]: '0xe627f00D5a5bfcE0640E771Af573C41e9a278A20'
    },
    helmetNftCommonMaster: {
        [ChainId.BSC_TESTNET]: '0x1B16aF670b0017ffD5E026008078599c322c50CF',
        [ChainId.BSC_MAINNET]: '0x163454D6313DC09eD376da6760cBEeA1efE2acF5'
    },
    helmetNft: {
        [ChainId.BSC_TESTNET]: '0xd97B0aDaFf4C8bd19a2587ce07f8416ad0860C90',
        [ChainId.BSC_MAINNET]: '0x2f0f57BADc77701E9e6384b9335cB9AA4900b08A'
    },
    petNFTCommonMaster: {
        [ChainId.BSC_TESTNET]: '0x68cA8D5Bf0aDA9f7dA0530bdbdcC324e37622d75',
        [ChainId.BSC_MAINNET]: '0x68cA8D5Bf0aDA9f7dA0530bdbdcC324e37622d75' // TODO
    },
    weaponNFTCommonMaster: {
        [ChainId.BSC_TESTNET]: '0x7fF8C60852834937BAb6ec3adb4403fE669628Cc',
        [ChainId.BSC_MAINNET]: '0x7fF8C60852834937BAb6ec3adb4403fE669628Cc' // TODO
    },
    petNft: {
        [ChainId.BSC_TESTNET]: '0xAa4cDa1838Ab17F6554EB2F1b3a65214083dF3f7',
        [ChainId.BSC_MAINNET]: '0x90E88d4c8E8f19af15DfEabD516d80666F06A2F5'
    },
    exchangePetNft: {
        [ChainId.BSC_TESTNET]: '0xc51Eadfb14e13b0071464a504167bc6868Fe6eEa',
        [ChainId.BSC_MAINNET]: '0xa3514F8ee39Ba80cD36B4aecfa2Fe2eb5fD6b326'
    },
    // bid pet nft
    bidPetNFT: {
        [ChainId.BSC_TESTNET]: '0xf6D05A90337596F3273a8A1914A1b4E94303767f',
        [ChainId.BSC_MAINNET]: '0x3bD857648Da97f3c395546E4F7F9fAD3aF29da33'
    },
    bestToken: {
        [ChainId.BSC_TESTNET]: '0xAE8044eF4264E672e142cA4d9fcD92135e8d2592',
        [ChainId.BSC_MAINNET]: '0x10747e2045a0ef884a0586AC81558F43285ea3c7'
    },
    bestMaster: {
        [ChainId.BSC_TESTNET]: '0x31f9B1f691884a8A744DCf29714d6B37bfB5E909',
        [ChainId.BSC_MAINNET]: '0x62Da74a42de360f1B5882d63e1E480fb80F0956f'
    },
    busdToken: {
        [ChainId.BSC_TESTNET]: '0xed24fc36d5ee211ea25a80239fb8c4cfd80f12ee',
        [ChainId.BSC_MAINNET]: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'
    },
    usdtToken: {
        [ChainId.BSC_TESTNET]: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
        [ChainId.BSC_MAINNET]: '0x55d398326f99059ff775485246999027b3197955'
    },
    transfer: {
        [ChainId.BSC_TESTNET]: '0x626d260DaAf60D0c1C52E9eB8F166055d3Ee59CC',
        [ChainId.BSC_MAINNET]: '0xf8177Cda1b5B5B022F7a87546Dcb646C5562E952'
    },
    weapon: {
        [ChainId.BSC_TESTNET]: '0x84525cE72f4f10C1Daa471C17f0DE14F96cd3132',
        [ChainId.BSC_MAINNET]: '0x3664d30A612824617e3Cf6935d6c762c8B476eDA'
    },
    weaponMaster: {
        [ChainId.BSC_TESTNET]: '0x5D036Eae933Bb2c7a00b97387D95eB74E6A8b24a',
        [ChainId.BSC_MAINNET]: '0x0c2fC172c822B923f92A17aD9EA5c15aD7332624'
    },
    weaponNFT: {
        [ChainId.BSC_TESTNET]: '0x2F2d38bC4C9d7b2A57432d8a7AB2093a432885Ca',
        [ChainId.BSC_MAINNET]: '0xBe7095dBBe04E8374ea5F9f5B3f30A48D57cb004'
    },
    exchangeWeaponNFT: {
        [ChainId.BSC_TESTNET]: '0xf9128Cd6D8B63106Da4058491A495b3Eb96afC5C',
        [ChainId.BSC_MAINNET]: '0xA4C3a8F8465FdDdE98A440f8cF5E180e6e33f644'
    },
    // bid weapon nft
    bidWeaponNFT: {
        [ChainId.BSC_TESTNET]: '0xE8931c2a02c75e547FA3b9aE8D2324c544bEF2C6',
        [ChainId.BSC_MAINNET]: '0x61E9181E7Fece6e2a79e1abfF71ACB99bd98E3E3'
    },
    binanceNft: {
        [ChainId.BSC_TESTNET]: '0x9D540ff9Af51178cB285Dc19629f9a7b2F9408Be',
        [ChainId.BSC_MAINNET]: '0xc014B45D680B5a4bf51cCdA778A68d5251C14b5E'
    },
    exchangeBinanceNft: {
        [ChainId.BSC_TESTNET]: '0xb40d08e866693E4A4AC6556A533D996DED5e7458',
        [ChainId.BSC_MAINNET]: '0x58e6E6e16A8fd619b6DE1dA4F614dfB31dcC07b2'
    },
    // bid binance nft
    bidBinanceNFT: {
        [ChainId.BSC_TESTNET]: '0x8A9b166E8cc39815B7D0D96F1D9f88EeFC774012',
        [ChainId.BSC_MAINNET]: '0xEF44A8D2830DFaC64A7493Ae60850cfb950567e1'
    },
    bakeryArtwork2NFT: {
        [ChainId.BSC_TESTNET]: '0xFfe09E64396d1b717DeF289A3aCB9F55d0A523A0',
        [ChainId.BSC_MAINNET]: '0x1233B9f706cB9028a03B61AF125cf1Fe840CDBD3'
    },
    exchangeBakeryArtwork2NFT: {
        [ChainId.BSC_TESTNET]: '0xC9DaA8877e21eF6Df3B9F25C4FE8F65B790E3329',
        [ChainId.BSC_MAINNET]: '0xC921239C1b5deaD79C889af1D9E006ef560FfFeA'
    },
    bidBakeryArtwork2NFT: {
        [ChainId.BSC_TESTNET]: '0x864BdcAd8dd09394711c28256a136D2a248fc8A5',
        [ChainId.BSC_MAINNET]: '0x616Ea437dFBf929ef49116614F6B2b610F48b0ae'
    },
    dogeMemeNFT: {
        [ChainId.BSC_TESTNET]: '0x241DDDC8fa9628923761D94779778288E69C9209',
        [ChainId.BSC_MAINNET]: '0x84d7FE5D949eA5fec5D84617bAdD7590275bFa72'
    },
    exchangeDogeMemeNFT: {
        [ChainId.BSC_TESTNET]: '0x73BD5E9FD21b53BDb455689feA4b03cba0Ffa2E6',
        [ChainId.BSC_MAINNET]: '0x8fb398BE7ACb7110436749A394e3D672b8Ddb2ff'
    },
    bidDogeMemeNFT: {
        [ChainId.BSC_TESTNET]: '0x0CE4128c061708718c1a519c11d31d80F297cf9b',
        [ChainId.BSC_MAINNET]: '0xe98631Ce5ccf1e9eF1638a76C78702a384A79E29'
    },
    reviewAddress: {
        [ChainId.BSC_TESTNET]: [
            '0x4627a245f31A325F986FbB0528B04bF56977fD8A',
            '0x626d260DaAf60D0c1C52E9eB8F166055d3Ee59CC',
            '0x2dDcee78258006FB332c748848AF6913455aCb1A',
            '0x5e03bE5F99D3fE5b771711ac874344b41f4f1eD4',
            '0xd9066cc6717210c586A50333B12359f7c90a7cDc'
        ],
        [ChainId.BSC_MAINNET]: [
            '0x4627a245f31A325F986FbB0528B04bF56977fD8A',
            '0x626d260DaAf60D0c1C52E9eB8F166055d3Ee59CC',
            '0x2dDcee78258006FB332c748848AF6913455aCb1A',
            '0x18920B8772249ed26390016ECd5Ad23CcE839C54',
            '0x54D272626aA031F30bDBB2f8009883ca1D487055',
            '0xf1465311E37BdBDE75d0231C7307C4f09b1d1200',
            '0x274Adf173DFA779a4684a5Febacaf6bc25121953',
            '0xEC02adD2E53ac17Cb9e8Af1Cf68F6Dc319E23304',
            '0x3A9e7266EF2c5F37AE906a4D4f4d9c96F32C2C0C',
            '0x92Ce0850222f9eF7271b2fb64f62F705daA4b064',
            '0xf3Ab6f5ccBb9C46e6ba6602cea91a4851Df4Fe29'
        ] // TODO
    },
    bakeryArtworkNFT: {
        [ChainId.BSC_TESTNET]: '0xC6911A6E1824b626dB9562df9A4634aE7BeE3621',
        [ChainId.BSC_MAINNET]: '0x5Bc94e9347F3b9Be8415bDfd24af16666704E44f'
    },
    exchangeBakeryArtworkNFT: {
        [ChainId.BSC_TESTNET]: '0x44Eb2059D03a189776f4A9F9f36dddB51FC6d582',
        [ChainId.BSC_MAINNET]: '0x26b82AB8269B2aD48FBDbbC9a08c78df7D68E814'
    },
    // bid bakery artwork nft
    bidBakeryArtworkNFT: {
        [ChainId.BSC_TESTNET]: '0x865D9379d9b2D20ECe1Bf0aEA1D933D75A81C7CD',
        [ChainId.BSC_MAINNET]: '0xE84E73889CDF43dbB57fFee42DC0615eb244891E'
    },
    bakeryArtworkRouter: {
        [ChainId.BSC_TESTNET]: '0x4090B62C9098731C4d9C03A0d9a0A99F0D3Ed30E',
        [ChainId.BSC_MAINNET]: '0x4A2a35D0D259ecd344FaB05adEb9c72389ADF2D8' // **没有发主网，主网没用这个合约
    },
    digitalArtworkNft: {
        [ChainId.BSC_TESTNET]: '0xe5f1ac1971f28cf8cbea5fee6fe61b1dd8908141',
        [ChainId.BSC_MAINNET]: '0xbc9535ceb418a27027f5cc560440f4a8823cb8bf'
    },
    exchangeArtworkNFT: {
        [ChainId.BSC_TESTNET]: '0x1BcD5753f219B776c668f3942a1b5436103482f6',
        [ChainId.BSC_MAINNET]: '0x59dC5A288dA642beAcA7bD0016065609fC06DF61'
    },
    // bid digital artwork nft
    bidDigitalArtworkNFT: {
        [ChainId.BSC_TESTNET]: '0x6A5aEDF1e54B9Ac41F6fEe5D3363d3970773f511',
        [ChainId.BSC_MAINNET]: '0x0c7Ab53232DA9a525ee93d20FD0BE256F512Cf8e'
    },
    petMaster2: {
        [ChainId.BSC_TESTNET]: '0xdB4d137261bA793d67d2A375d4aaA55F2eE1E396',
        [ChainId.BSC_MAINNET]: '0x5d2FE774032596D2C69Dc441fD137A1F43725E08'
    },
    exchangeEggNFT: {
        [ChainId.BSC_TESTNET]: '0x09B3B152E20ABACd0C67C8784bA8A25063D985CB',
        [ChainId.BSC_MAINNET]: '0x8443BE845c3D03Ac723411861025d0e8F453950f'
    },
    // bid pet egg nft
    bidPetEggNFT: {
        [ChainId.BSC_TESTNET]: '0x1a70E2a27E18adAdeD9015Bec58605A583Ef105b',
        [ChainId.BSC_MAINNET]: '0x437bf818Ae0b62C0E1Ad823877e2e5C25d07682B'
    },
    petEggNft: {
        [ChainId.BSC_TESTNET]: '0x0B619B394cA844576E571E43b6A120882Eb8C59a',
        [ChainId.BSC_MAINNET]: '0x8A3ACae3CD954fEdE1B46a6cc79f9189a6C79c56'
    },
    pet: {
        [ChainId.BSC_TESTNET]: '0xe59af933b309aFF12f323111B2B1648fF45D5dc0',
        [ChainId.BSC_MAINNET]: '0x4d4e595d643dc61EA7FCbF12e4b1AAA39f9975B8'
    },
    petMaster: {
        [ChainId.BSC_TESTNET]: '0xfe292e44fE33579b3690dE57302263B3d6B59739',
        [ChainId.BSC_MAINNET]: '0x4A2a35D0D259ecd344FaB05adEb9c72389ADF2D8'
    },
    dish: {
        [ChainId.BSC_TESTNET]: '0xC3a7736b284cE163c45D92b75da4d4A34847be63',
        [ChainId.BSC_MAINNET]: '0xa7463C3163962b12AEB623147c2043Bb54834962',
        42: '0x43a7903E3a839a67192151eE300e11198985E54b',
        1: '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2'
    },
    dishMaster: {
        [ChainId.BSC_TESTNET]: '0x22CbdB1Da36B35725d1D75A7784271EE3f869b30',
        [ChainId.BSC_MAINNET]: '0x7145319189629AFcF31754D8AC459265FCa4cF91',
        42: '0x43a7903E3a839a67192151eE300e11198985E54b',
        1: '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2'
    },
    exchangeNFT: {
        [ChainId.BSC_TESTNET]: '0x6ebF7b9F11a81101d4a929e19FCefba72e8AE5cc',
        [ChainId.BSC_MAINNET]: '0x05D189D22D9916837A82438D74F3837Ac70b2831'
    },
    // bid dish nft
    bidDishNFT: {
        [ChainId.BSC_TESTNET]: '0x7D055aB74Cf65fb1a3C62A3F7c74172F19a39086',
        [ChainId.BSC_MAINNET]: '0x2D01300340bF6bFad0D7f830102188D6291dDc15'
    },
    sushi: {
        [ChainId.BSC_TESTNET]: '0xe02df9e3e622debdd69fb838bb799e3f168902c5',
        [ChainId.BSC_MAINNET]: '0xe02df9e3e622debdd69fb838bb799e3f168902c5',
        // [ChainId.BSC_MAINNET]: '0x918DE02364E0b63CE83e3741d254D19D8FE8f914', // 主网预生产合约
        42: '0x43a7903E3a839a67192151eE300e11198985E54b',
        1: '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2'
    },
    masterChef: {
        [ChainId.BSC_TESTNET]: '0x20eC291bB8459b6145317E7126532CE7EcE5056f',
        [ChainId.BSC_MAINNET]: '0x20eC291bB8459b6145317E7126532CE7EcE5056f',
        // [ChainId.BSC_MAINNET]: '0xBd9695B0F5fBC902cb55e2F2F5d2cf0A7002c834', // 主网预生产合约
        1: '0xc2edad668740f1aa35e4d8f227fb8e17dca888cd'
    },
    weth: {
        [ChainId.BSC_TESTNET]: '0x094616f0bdfb0b526bd735bf66eca0ad254ca81f', // WBNB
        [ChainId.BSC_MAINNET]: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
    },
    bakeDestroyed: {
        [ChainId.BSC_TESTNET]: '0x3aDa268097c7d9973A2D4cCD1ca939c386AbCFb7',
        [ChainId.BSC_MAINNET]: '0x732B6620D3469204BCC6F44c0b40cD8C4bAfC747' // 主网生产
        // [ChainId.BSC_MAINNET]: '0x8d01c3d91A22ca77A4B33e5e82b9e1eE48e78542' // 主网预生产合约
    },
    bakeDestroyedManager: {
        [ChainId.BSC_TESTNET]: '0x337E3Cee9c3e892F84c76B0Ec2C06fd4Ab06A734',
        [ChainId.BSC_MAINNET]: '0x2dab7D9A2A8c5a4e085377043619D2e7f2914700' // 主网生产
        // [ChainId.BSC_MAINNET]: '0x03FFFEF727C4e85468130aA0513e0428c6CFeFB1' // 主网预生产合约
    }
}

// mint bake pools
export const supportedPools = [
    {
        pid: 7,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0xe02df9e3e622debdd69fb838bb799e3f168902c5',
            [ChainId.BSC_MAINNET]: '0xe02df9e3e622debdd69fb838bb799e3f168902c5', // 主网生产
            // [ChainId.BSC_MAINNET]: '0x918DE02364E0b63CE83e3741d254D19D8FE8f914', // 主网预生产合约ODO
            1: '0xce84867c3c02b05dc570d0135103d3fb9cc19433'
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'Bread',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'bread'
    },
    {
        pid: 23,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.bakeBatBlp[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.bakeBatBlp[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BAT',
        symbol: 'BAKE-BAT BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'bat',
        stakeIcon: 'bakeBat'
    },
    {
        pid: 21,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.bakeMxBlp[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.bakeMxBlp[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'MX',
        symbol: 'BAKE-MX BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'mx',
        stakeIcon: 'bakeMx'
    },
    {
        pid: 20,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.bakeWarBlp[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.bakeWarBlp[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'WAR',
        symbol: 'BAKE-WAR BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'war'
    },
    {
        pid: 19,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.pCWSBnbBlp[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.pCWSBnbBlp[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.pCWS[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.pCWS[ChainId.BSC_MAINNET]
        },
        name: 'pCWS',
        symbol: 'BNB-pCWS BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'pcws'
    },
    {
        pid: 18,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.DEFI100BakeBLP[ChainId.BSC_TESTNET], // use bake bnb
            [ChainId.BSC_MAINNET]: contractAddresses.DEFI100BakeBLP[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'D100',
        symbol: 'BAKE-D100 BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'defi100'
    },
    {
        pid: 17,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.BRYBakeBLP[ChainId.BSC_TESTNET], // use bake bnb
            [ChainId.BSC_MAINNET]: contractAddresses.BRYBakeBLP[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BRY',
        symbol: 'BAKE-BRY BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'bry'
    },
    {
        pid: 16,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0x8170b95AaCe8F494090Db7A4a17ba9EB73C2413C', // use bake bnb
            [ChainId.BSC_MAINNET]: '0x8F30114846012e5C1Fa33F32Cf93b0250C90E05a'
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'SHIELD',
        symbol: 'BAKE-SHIELD BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'shield'
    },
    {
        pid: 14,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0x8170b95AaCe8F494090Db7A4a17ba9EB73C2413C', // use bake bnb
            [ChainId.BSC_MAINNET]: '0xdb2d83eD108E68cc1C9689081d54673Bd9402A54'
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'DOGE',
        symbol: 'BAKE-DOGE BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'doge.png'
    },
    {
        pid: 12,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.pet[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.pet[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.pet[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.pet[ChainId.BSC_MAINNET]
        },
        name: 'PET Staking',
        symbol: 'PET',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'pets',
        activityTime: 'Start from Oct. 23 10:00 UTC to Oct. 26 10:00 UTC',
        ended: true
    },
    {
        pid: 13,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0x1699bCe1AE94fE00226329dcbBe5FE006CAF3D59',
            [ChainId.BSC_MAINNET]: '0x6F72943c807BdFaC19bAE25E84B8E99Fee0305FC'
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.pet[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.pet[ChainId.BSC_MAINNET]
        },
        name: 'Pet Food',
        symbol: 'PET-BAKE BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'petfood'
    },
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0x47d34Fd4f095767E718F110AfEf030bb18E8C48F',
            [ChainId.BSC_MAINNET]: '0xc2Eed0F5a0dc28cfa895084bC0a9B8B8279aE492',
            1: '0xce84867c3c02b05dc570d0135103d3fb9cc19433'
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'Doughnut',
        symbol: 'BAKE-BNB BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'doughnut'
    },
    {
        pid: 8,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0x8170b95AaCe8F494090Db7A4a17ba9EB73C2413C', // use bake bnb
            [ChainId.BSC_MAINNET]: '0x6E218EA042BeF40a8baF706b00d0f0A7b4fCE50a'
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'Waffle',
        symbol: 'BAKE-BUSD BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'waffle'
    },
    {
        pid: 9,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0x8170b95AaCe8F494090Db7A4a17ba9EB73C2413C', // use bake bnb
            [ChainId.BSC_MAINNET]: '0x5B294814Ca563E81085a858c0e53B9F2c7a3927f'
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'Rolls',
        symbol: 'BAKE-DOT BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'rolls',
        ended: true
    },
    {
        pid: 2,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0xAf5e8AA68dd1b61376aC4F6fa4D06A5A4AB6cafD',
            [ChainId.BSC_MAINNET]: '0x559e3D9611E9cB8a77c11335Bdac49621382188B',
            1: '0xa5904961f61bae7c4dd8478077556c91bf291cfd'
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: '0xed24fc36d5ee211ea25a80239fb8c4cfd80f12ee',
            [ChainId.BSC_MAINNET]: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
            1: '0xaba8cac6866b83ae4eec97dd07ed254282f6ad8a'
        },
        name: 'Croissant',
        symbol: 'BUSD-BNB BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'croissant'
    },
    {
        pid: 10,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0x95D619e70160D289933c7E6A98E7dFD3a2C75e27',
            [ChainId.BSC_MAINNET]: '0xbcF3278098417E23d941613ce36a7cE9428724A5', // 主网生产
            1: '0xce84867c3c02b05dc570d0135103d3fb9cc19433'
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: '0x95d619e70160d289933c7e6a98e7dfd3a2c75e27',
            [ChainId.BSC_MAINNET]: '0xe9e7cea3dedca5984780bafc599bd69add087d56', // 主网生产
            1: '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2'
        },
        name: 'Latte',
        symbol: 'USDT-BUSD BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'latte'
    },
    {
        pid: 22,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.busdUsdcBlp[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.busdUsdcBlp[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.busd[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.busd[ChainId.BSC_MAINNET]
        },
        name: 'BUSD-USDC BLP',
        symbol: 'BUSD-USDC BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'busdUsdc'
    },
    {
        pid: 3,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0x6f469DAE7F333EdfC98c6057F12E2A7521a9861c',
            [ChainId.BSC_MAINNET]: '0xa50b9c5DB61C855D5939aa1a66B26Df77745809b',
            1: '0xa5904961f61bae7c4dd8478077556c91bf291cfd'
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: '0xd66c6b4f0be8ce5b39d52e0fd1344c389929b378',
            [ChainId.BSC_MAINNET]: '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
            1: '0xaba8cac6866b83ae4eec97dd07ed254282f6ad8a'
        },
        name: 'Toast',
        symbol: 'ETH-BNB BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'toast'
    },
    {
        pid: 4,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0xf6fD8961F129955A51ba3B392B40594B499dEF3a',
            [ChainId.BSC_MAINNET]: '0x58521373474810915b02FE968D1BCBe35Fc61E09',
            1: '0xa5904961f61bae7c4dd8478077556c91bf291cfd'
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: '0x6ce8da28e2f864420840cf74474eff5fd80e65b8',
            [ChainId.BSC_MAINNET]: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
            1: '0xaba8cac6866b83ae4eec97dd07ed254282f6ad8a'
        },
        name: 'Cake',
        symbol: 'BTC-BNB BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'cake'
    },
    {
        pid: 5,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0x937c36B10F0a0B3aeA8a3EF0Ef9eB56E74692A84', // use btc
            [ChainId.BSC_MAINNET]: '0x56D68e3645c9A010c7fD5313530b9194Ff66C725',
            1: '0xa5904961f61bae7c4dd8478077556c91bf291cfd'
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: '0x6ce8da28e2f864420840cf74474eff5fd80e65b8', // use btc
            [ChainId.BSC_MAINNET]: '0x7083609fce4d1d8dc0c979aab8c869ea2c873402',
            1: '0xaba8cac6866b83ae4eec97dd07ed254282f6ad8a'
        },
        name: 'Cookies',
        symbol: 'DOT-BNB BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'cookies',
        ended: true
    },
    {
        pid: 6,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0x5B85218b6079524867ed3D99Bd345B873278CA4F', // use btc
            [ChainId.BSC_MAINNET]: '0x52AaEF46c9F02dBC45Ce3a55ff2B7057f5aB6275',
            1: '0xa5904961f61bae7c4dd8478077556c91bf291cfd'
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: '0x6ce8da28e2f864420840cf74474eff5fd80e65b8', // use btc
            [ChainId.BSC_MAINNET]: '0xf8a0bf9cf54bb92f17374d9e9a321e6a111a51bd',
            1: '0xaba8cac6866b83ae4eec97dd07ed254282f6ad8a'
        },
        name: 'Pineapple bun',
        symbol: 'LINK-BNB BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'pineapple_bun',
        ended: true
    }
]

// new Pools下的矿池必须在pet/bake矿池中有
export const supportedNewPools = [
    {
        pid: 23,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.bakeBatBlp[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.bakeBatBlp[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BAT',
        symbol: 'BAKE-BAT BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'bat'
    },
    {
        pid: 21,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.bakeMxBlp[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.bakeMxBlp[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'MX',
        symbol: 'BAKE-MX BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'mx'
    },
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BAKE to MX',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.MX,
        icon: 'mx',
        stakeIcon: 'bake',
        otherName: 'MX'
    },
    {
        pid: 2,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.bnbDieselBlp[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.bnbDieselBlp[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.diesel[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.diesel[ChainId.BSC_MAINNET]
        },
        name: 'BNB-DIESEL BLP',
        symbol: 'BNB-DIESEL BLP',
        tokenSymbol: MINTTOKEN.DIESEL,
        icon: 'diesel',
        stakeIcon: 'bnb_diesel',
        otherName: 'DIESEL'
    },
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BAKE to DIESEL',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.DIESEL,
        icon: 'diesel',
        stakeIcon: 'bake',
        otherName: 'DIESEL'
    },
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'TKO NFT Pool',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.TKONFT,
        icon: 'tkonft',
        stakeIcon: 'bake',
        otherName: 'TKO NFT'
    },
    {
        pid: 20,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.bakeWarBlp[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.bakeWarBlp[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'WAR',
        symbol: 'BAKE-WAR BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'war'
    },
    {
        pid: 2,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BAKE to WAR',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.WAR,
        icon: 'war',
        stakeIcon: 'bake',
        otherName: 'WAR'
    },
    {
        pid: 2,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BAKE to pCWS',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.PCWS,
        icon: 'pcws',
        stakeIcon: 'bake',
        otherName: 'pCWS'
    },
    {
        pid: 19,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.pCWSBnbBlp[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.pCWSBnbBlp[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.pCWS[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.pCWS[ChainId.BSC_MAINNET]
        },
        name: 'pCWS',
        symbol: 'BNB-pCWS BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'pcws'
    },
    {
        pid: 18,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.DEFI100BakeBLP[ChainId.BSC_TESTNET], // use bake bnb
            [ChainId.BSC_MAINNET]: contractAddresses.DEFI100BakeBLP[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'D100',
        symbol: 'BAKE-D100 BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'defi100'
    },
    {
        pid: 17,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.BRYBakeBLP[ChainId.BSC_TESTNET], // use bake bnb
            [ChainId.BSC_MAINNET]: contractAddresses.BRYBakeBLP[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BRY',
        symbol: 'BAKE-BRY BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'bry'
    },
    {
        pid: 16,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0x8170b95AaCe8F494090Db7A4a17ba9EB73C2413C', // use bake bnb
            [ChainId.BSC_MAINNET]: '0x8F30114846012e5C1Fa33F32Cf93b0250C90E05a'
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'SHIELD',
        symbol: 'BAKE-SHIELD BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'shield'
    },
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BAKE to SHIELD',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.SHIELD,
        icon: 'shield',
        stakeIcon: 'bake',
        otherName: 'SHIELD',
        ended: true
    },
    {
        pid: 14,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0x8170b95AaCe8F494090Db7A4a17ba9EB73C2413C', // use bake bnb
            [ChainId.BSC_MAINNET]: '0xdb2d83eD108E68cc1C9689081d54673Bd9402A54'
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'DOGE',
        symbol: 'BAKE-DOGE BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'doge.png'
    },
    {
        pid: 13,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0x1699bCe1AE94fE00226329dcbBe5FE006CAF3D59',
            [ChainId.BSC_MAINNET]: '0x6F72943c807BdFaC19bAE25E84B8E99Fee0305FC'
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.pet[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.pet[ChainId.BSC_MAINNET]
        },
        name: 'Pet Food',
        symbol: 'PET-BAKE BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'petfood'
    },
    {
        pid: 2,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BAKE to Weapon',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.WEAPON,
        icon: 'bake_weapon',
        stakeIcon: 'bake'
    },
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.pet[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.pet[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.pet[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.pet[ChainId.BSC_MAINNET]
        },
        name: 'PET to Weapon',
        symbol: 'PET',
        tokenSymbol: MINTTOKEN.WEAPON,
        icon: 'pet_weapon',
        stakeIcon: 'pet'
    }
]

export const supportedPetPools = [
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'Pet Airdrop',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.PET,
        icon: 'pets',
        activityTime: '5000 PET/hour from Oct. 20 07:00 UTC to Oct. 20 19:00 UTC',
        amountDay: 5000,
        amountUnit: 'PET/Hour',
        stakeIcon: 'bake'
    }
]

export const endedPools = [
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BUSD-WAR BLP',
        symbol: 'BUSD-WAR BLP',
        tokenSymbol: MINTTOKEN.WAR2,
        icon: 'war',
        stakeIcon: 'bake',
        otherName: 'WAR'
    },
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.pCWS[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.pCWS[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.pCWS[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.pCWS[ChainId.BSC_MAINNET]
        },
        name: 'CWS NFT Pool',
        symbol: 'pCWS',
        tokenSymbol: MINTTOKEN.SEASCAPENFT,
        icon: 'seascapenft',
        stakeIcon: 'helmetnft',
        otherName: 'SEASCAPE NFT'
    },
    {
        pid: 2,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.bakeBananaBlp[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.bakeBananaBlp[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.BANANA[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.BANANA[ChainId.BSC_MAINNET]
        },
        name: 'BANANA',
        symbol: 'BAKE BANANA BLP',
        tokenSymbol: MINTTOKEN.BANANA,
        icon: 'banana',
        stakeIcon: 'banana',
        otherName: 'BANANA'
    },
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BAKE to BRY',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.BRY,
        icon: 'bry',
        stakeIcon: 'bake',
        otherName: 'BRY'
    },
    {
        pid: 100,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'D100(not used) ',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.DEFI100,
        icon: 'defi100',
        stakeIcon: 'bake',
        otherName: 'D100'
    },
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'D100(not used)',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.DEFI100OLD,
        icon: 'defi100',
        stakeIcon: 'bake',
        otherName: 'D100'
    },
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BAKE to SHIELD',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.SHIELD,
        icon: 'shield',
        stakeIcon: 'bake',
        otherName: 'SHIELD'
    },
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BAKE to wSOTE',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.WSOTE,
        icon: 'wsote',
        stakeIcon: 'bake',
        otherName: 'wSOTE'
    },
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.tenBakeBLP[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.tenBakeBLP[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.ten[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.ten[ChainId.BSC_MAINNET]
        },
        name: 'Bake to Ten',
        symbol: 'TEN-BAKE BLP',
        tokenSymbol: MINTTOKEN.TEN,
        icon: 'ten1',
        stakeIcon: 'staketen',
        otherName: 'TEN'
    },
    {
        pid: 2,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.ten[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.ten[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.ten[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.ten[ChainId.BSC_MAINNET]
        },
        name: 'Ten to PET NFT',
        symbol: 'TEN',
        tokenSymbol: MINTTOKEN.TEN,
        icon: 'ten2',
        stakeIcon: 'helmetnft',
        otherName: 'PET NFT',
        amountUnit: 'PET NFT',
        amountDay: '100'
    },
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'NFT Christmas Hat',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.HATNFT,
        icon: 'helmetnft',
        stakeIcon: 'helmetnft',
        otherName: 'NFT Xmas Hat'
    },
    {
        pid: 12,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.pet[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.pet[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.pet[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.pet[ChainId.BSC_MAINNET]
        },
        name: 'PET Staking',
        symbol: 'PET',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'pets',
        activityTime: 'Start from Oct. 23 10:00 UTC to Oct. 26 10:00 UTC'
    },
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'Pet Airdrop',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.PET,
        icon: 'pets',
        activityTime: '5000 PET/hour from Oct. 20 07:00 UTC to Oct. 20 19:00 UTC',
        amountDay: 5000,
        amountUnit: 'PET/Hour',
        stakeIcon: 'bake'
    },
    {
        pid: 5,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0x937c36B10F0a0B3aeA8a3EF0Ef9eB56E74692A84', // use btc
            [ChainId.BSC_MAINNET]: '0x56D68e3645c9A010c7fD5313530b9194Ff66C725',
            1: '0xa5904961f61bae7c4dd8478077556c91bf291cfd'
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: '0x6ce8da28e2f864420840cf74474eff5fd80e65b8', // use btc
            [ChainId.BSC_MAINNET]: '0x7083609fce4d1d8dc0c979aab8c869ea2c873402',
            1: '0xaba8cac6866b83ae4eec97dd07ed254282f6ad8a'
        },
        name: 'Cookies',
        symbol: 'DOT-BNB BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'cookies'
    },
    {
        pid: 6,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0x5B85218b6079524867ed3D99Bd345B873278CA4F', // use btc
            [ChainId.BSC_MAINNET]: '0x52AaEF46c9F02dBC45Ce3a55ff2B7057f5aB6275',
            1: '0xa5904961f61bae7c4dd8478077556c91bf291cfd'
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: '0x6ce8da28e2f864420840cf74474eff5fd80e65b8', // use btc
            [ChainId.BSC_MAINNET]: '0xf8a0bf9cf54bb92f17374d9e9a321e6a111a51bd',
            1: '0xaba8cac6866b83ae4eec97dd07ed254282f6ad8a'
        },
        name: 'Pineapple bun',
        symbol: 'LINK-BNB BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'pineapple_bun'
    },
    {
        pid: 9,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0x8170b95AaCe8F494090Db7A4a17ba9EB73C2413C', // use bake bnb
            [ChainId.BSC_MAINNET]: '0x5B294814Ca563E81085a858c0e53B9F2c7a3927f'
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'Rolls',
        symbol: 'BAKE-DOT BLP',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'rolls'
    },
    {
        pid: 2,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BAKE to BEST',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.BEST,
        icon: 'bake_best',
        amountDay: 5000,
        amountUnit: 'BEST',
        stakeIcon: 'bake'
    },
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0x7499b895F98E4B6FEab59c51322527f9Dec80794',
            [ChainId.BSC_MAINNET]: '0x229E9F691ed34cf4cb706Fae7bF65AeB9020E329'
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.pet[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.pet[ChainId.BSC_MAINNET]
        },
        name: 'Earn PET',
        symbol: 'PET-BNB BLP',
        tokenSymbol: MINTTOKEN.BPET,
        icon: 'pets',
        // activityTime: '5000 PET/hour from Oct. 20 07:00 UTC to Oct. 20 19:00 UTC',
        stakeIcon: 'pets',
        otherName: 'PET'
    }
]

export const bPetPools = [
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0x7499b895F98E4B6FEab59c51322527f9Dec80794',
            [ChainId.BSC_MAINNET]: '0x229E9F691ed34cf4cb706Fae7bF65AeB9020E329'
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.pet[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.pet[ChainId.BSC_MAINNET]
        },
        name: 'Earn PET',
        symbol: 'PET-BNB BLP',
        tokenSymbol: MINTTOKEN.BPET,
        icon: 'pets',
        // activityTime: '5000 PET/hour from Oct. 20 07:00 UTC to Oct. 20 19:00 UTC',
        stakeIcon: 'pets',
        otherName: 'PET'
    }
]

export const weaponPools = [
    {
        pid: 2,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BAKE to Weapon',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.WEAPON,
        icon: 'bake_weapon',
        stakeIcon: 'bake'
    },
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.pet[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.pet[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.pet[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.pet[ChainId.BSC_MAINNET]
        },
        name: 'PET to Weapon',
        symbol: 'PET',
        tokenSymbol: MINTTOKEN.WEAPON,
        icon: 'pet_weapon',
        stakeIcon: 'pet'
    }
]

export const bestPools = [
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BAKE to BEST',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.BEST,
        icon: 'bake_best',
        amountDay: 5000,
        amountUnit: 'BEST',
        stakeIcon: 'bake'
    }
]

export const weaponnftPools = [
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'Weapon NFT',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.WEAPONNFT,
        icon: 'weaponnft',
        stakeIcon: 'weaponnft',
        otherName: 'Weapon NFT'
    }
]

export const petNftPools = [
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BAKE to Pet NFT',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.PETNFT,
        icon: 'weaponnft',
        stakeIcon: 'weaponnft',
        otherName: 'Pet NFT'
    },
    {
        pid: 2,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.pet[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.pet[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.pet[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.pet[ChainId.BSC_MAINNET]
        },
        name: 'PET to Pet NFT',
        symbol: 'PET',
        tokenSymbol: MINTTOKEN.PETNFT,
        icon: 'weaponnft',
        stakeIcon: 'pet',
        otherName: 'Pet NFT'
    }
]

export const helmetNftPools = [
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'TKO NFT Pool',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.TKONFT,
        icon: 'tkonft',
        stakeIcon: 'bake',
        otherName: 'TKO NFT'
    }
    // {
    //   pid: 1,
    //   lpAddresses: {
    //     [ChainId.BSC_TESTNET]: contractAddresses.pCWS[ChainId.BSC_TESTNET],
    //     [ChainId.BSC_MAINNET]: contractAddresses.pCWS[ChainId.BSC_MAINNET]
    //   },
    //   tokenAddresses: {
    //     [ChainId.BSC_TESTNET]: contractAddresses.pCWS[ChainId.BSC_TESTNET],
    //     [ChainId.BSC_MAINNET]: contractAddresses.pCWS[ChainId.BSC_MAINNET]
    //   },
    //   name: 'CWS NFT Pool',
    //   symbol: 'pCWS',
    //   tokenSymbol: MINTTOKEN.SEASCAPENFT,
    //   icon: 'seascapenft',
    //   stakeIcon: 'helmetnft',
    //   otherName: 'SEASCAPE NFT'
    // },
    // {
    //   pid: 1,
    //   lpAddresses: {
    //     [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
    //     [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
    //   },
    //   tokenAddresses: {
    //     [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
    //     [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
    //   },
    //   name: 'NFT Christmas Hat',
    //   symbol: 'BAKE',
    //   tokenSymbol: MINTTOKEN.HATNFT,
    //   icon: 'helmetnft',
    //   stakeIcon: 'helmetnft',
    //   otherName: 'Xmas hats NFT'
    // },
    // {
    //   pid: 2,
    //   lpAddresses: {
    //     [ChainId.BSC_TESTNET]: contractAddresses.ten[ChainId.BSC_TESTNET],
    //     [ChainId.BSC_MAINNET]: contractAddresses.ten[ChainId.BSC_MAINNET]
    //   },
    //   tokenAddresses: {
    //     [ChainId.BSC_TESTNET]: contractAddresses.ten[ChainId.BSC_TESTNET],
    //     [ChainId.BSC_MAINNET]: contractAddresses.ten[ChainId.BSC_MAINNET]
    //   },
    //   name: 'Ten to PET NFT',
    //   symbol: 'TEN',
    //   tokenSymbol: MINTTOKEN.TEN,
    //   icon: 'ten2',
    //   stakeIcon: 'helmetnft',
    //   otherName: 'PET NFT',
    //   amountUnit: 'PET NFT',
    //   amountDay: '100'
    // }
]

export const hatNftPools = [
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'NFT Christmas Hat',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.HATNFT,
        icon: 'helmetnft',
        stakeIcon: 'helmetnft',
        otherName: 'Xmas hats NFT'
    }
]

export const eth2MasterPools = [
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0x07b5a883c74a844232533ee8b713f5210fe15b5b',
            [ChainId.BSC_MAINNET]: '0xFb72D7C0f1643c96c197A98E5f36eBcf7597d0E3'
        },
        tokenAddresses: [
            {
                [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
                [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
            },
            {
                [ChainId.BSC_TESTNET]: '0x747c58A36Fe414032072d671ccdf38720aDDb1a9',
                [ChainId.BSC_MAINNET]: '0x250632378E573c6Be1AC2f97Fcdf00515d0Aa91B'
            }
        ],
        name: 'Hamburger',
        symbol: 'BETH-ETH BLP',
        tokenSymbol: MINTTOKEN.ETH2MASTER,
        icon: 'hamburger',
        stakeIcon: 'eth',
        otherName: 'BETH + BAKE',
        bethRoi: 15,
        bakeRoi: 15
    },
    {
        pid: 2,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0x392a2cfd11f5933fc48f6d132567bf0d8816443e',
            [ChainId.BSC_MAINNET]: '0x2fC2aD3c28560C97CAcA6D2DcF9B38614F48769A'
        },
        tokenAddresses: [
            {
                [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
                [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
            },
            {
                [ChainId.BSC_TESTNET]: '0x747c58A36Fe414032072d671ccdf38720aDDb1a9',
                [ChainId.BSC_MAINNET]: '0x250632378E573c6Be1AC2f97Fcdf00515d0Aa91B'
            }
        ],
        name: 'Macaroon',
        symbol: 'BETH-BNB BLP',
        tokenSymbol: MINTTOKEN.ETH2MASTER,
        icon: 'macaroon',
        stakeIcon: 'eth',
        otherName: 'BETH + BAKE',
        bethRoi: 15,
        bakeRoi: 15
    },
    {
        pid: 3,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0xa759f0fd9918bba2c03687492d5b7dc37ebd9ac9',
            [ChainId.BSC_MAINNET]: '0x5FeF671Df9718934FDa164da289374f675745D86'
        },
        tokenAddresses: [
            {
                [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
                [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
            },
            {
                [ChainId.BSC_TESTNET]: '0x747c58A36Fe414032072d671ccdf38720aDDb1a9',
                [ChainId.BSC_MAINNET]: '0x250632378E573c6Be1AC2f97Fcdf00515d0Aa91B'
            }
        ],
        name: 'Macaroon2',
        symbol: 'BETH-BUSD BLP',
        tokenSymbol: MINTTOKEN.ETH2MASTER,
        icon: 'macaroon2',
        stakeIcon: 'eth',
        otherName: 'BETH + BAKE',
        bethRoi: 15,
        bakeRoi: 15
    }
]

export const aethMasterPools = [
    {
        pid: 4,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0x29A96ac9949C1de0Ac9896Ae2A2229570dFd867E',
            [ChainId.BSC_MAINNET]: '0x8c7e17ebe49943109F04c85dF540609c660E2a27'
        },
        tokenAddresses: [
            {
                [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
                [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
            },
            {
                [ChainId.BSC_TESTNET]: contractAddresses.ankr[ChainId.BSC_TESTNET],
                [ChainId.BSC_MAINNET]: contractAddresses.ankr[ChainId.BSC_MAINNET]
            },
            {
                [ChainId.BSC_TESTNET]: contractAddresses.onx[ChainId.BSC_TESTNET],
                [ChainId.BSC_MAINNET]: contractAddresses.onx[ChainId.BSC_MAINNET]
            }
        ],
        name: 'Macaroon3',
        symbol: 'AETH-BETH BLP',
        tokenSymbol: MINTTOKEN.AETHMASTER,
        icon: 'macaroon3',
        stakeIcon: 'aeth',
        otherName: 'ANKR + ONX + BAKE',
        bethRoi: 15,
        bakeRoi: 15
    },
    {
        pid: 5,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0x21B712E0A15DE4b0DB343F958aDA7d6Dbc31ba59',
            [ChainId.BSC_MAINNET]: '0xcCFe31Dd6B74b2695a5163a6648d28766323EbC3'
        },
        tokenAddresses: [
            {
                [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
                [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
            },
            {
                [ChainId.BSC_TESTNET]: contractAddresses.ankr[ChainId.BSC_TESTNET],
                [ChainId.BSC_MAINNET]: contractAddresses.ankr[ChainId.BSC_MAINNET]
            },
            {
                [ChainId.BSC_TESTNET]: contractAddresses.onx[ChainId.BSC_TESTNET],
                [ChainId.BSC_MAINNET]: contractAddresses.onx[ChainId.BSC_MAINNET]
            }
        ],
        name: 'Macaroon4',
        symbol: 'AETH-ETH BLP',
        tokenSymbol: MINTTOKEN.AETHMASTER,
        icon: 'macaroon4',
        stakeIcon: 'aeth',
        otherName: 'ANKR + ONX + BAKE',
        bethRoi: 15,
        bakeRoi: 15
    }
]

export const aethAndEth2Pools = [
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0x07b5a883c74a844232533ee8b713f5210fe15b5b',
            [ChainId.BSC_MAINNET]: '0xFb72D7C0f1643c96c197A98E5f36eBcf7597d0E3'
        },
        tokenAddresses: [
            {
                [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
                [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
            },
            {
                [ChainId.BSC_TESTNET]: '0x747c58A36Fe414032072d671ccdf38720aDDb1a9',
                [ChainId.BSC_MAINNET]: '0x250632378E573c6Be1AC2f97Fcdf00515d0Aa91B'
            }
        ],
        name: 'Hamburger',
        symbol: 'BETH-ETH BLP',
        tokenSymbol: MINTTOKEN.ETH2MASTER,
        icon: 'hamburger',
        stakeIcon: 'eth',
        otherName: 'BETH + BAKE',
        bethRoi: 15,
        bakeRoi: 15
    },
    {
        pid: 2,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0x392a2cfd11f5933fc48f6d132567bf0d8816443e',
            [ChainId.BSC_MAINNET]: '0x2fC2aD3c28560C97CAcA6D2DcF9B38614F48769A'
        },
        tokenAddresses: [
            {
                [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
                [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
            },
            {
                [ChainId.BSC_TESTNET]: '0x747c58A36Fe414032072d671ccdf38720aDDb1a9',
                [ChainId.BSC_MAINNET]: '0x250632378E573c6Be1AC2f97Fcdf00515d0Aa91B'
            }
        ],
        name: 'Macaroon',
        symbol: 'BETH-BNB BLP',
        tokenSymbol: MINTTOKEN.ETH2MASTER,
        icon: 'macaroon',
        stakeIcon: 'eth',
        otherName: 'BETH + BAKE',
        bethRoi: 15,
        bakeRoi: 15
    },
    {
        pid: 3,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0xa759f0fd9918bba2c03687492d5b7dc37ebd9ac9',
            [ChainId.BSC_MAINNET]: '0x5FeF671Df9718934FDa164da289374f675745D86'
        },
        tokenAddresses: [
            {
                [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
                [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
            },
            {
                [ChainId.BSC_TESTNET]: '0x747c58A36Fe414032072d671ccdf38720aDDb1a9',
                [ChainId.BSC_MAINNET]: '0x250632378E573c6Be1AC2f97Fcdf00515d0Aa91B'
            }
        ],
        name: 'Macaroon2',
        symbol: 'BETH-BUSD BLP',
        tokenSymbol: MINTTOKEN.ETH2MASTER,
        icon: 'macaroon2',
        stakeIcon: 'eth',
        otherName: 'BETH + BAKE',
        bethRoi: 15,
        bakeRoi: 15
    },
    {
        pid: 4,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0x29A96ac9949C1de0Ac9896Ae2A2229570dFd867E',
            [ChainId.BSC_MAINNET]: '0x8c7e17ebe49943109F04c85dF540609c660E2a27'
        },
        tokenAddresses: [
            {
                [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
                [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
            },
            {
                [ChainId.BSC_TESTNET]: contractAddresses.ankr[ChainId.BSC_TESTNET],
                [ChainId.BSC_MAINNET]: contractAddresses.ankr[ChainId.BSC_MAINNET]
            },
            {
                [ChainId.BSC_TESTNET]: contractAddresses.onx[ChainId.BSC_TESTNET],
                [ChainId.BSC_MAINNET]: contractAddresses.onx[ChainId.BSC_MAINNET]
            }
        ],
        name: 'Macaroon3',
        symbol: 'AETH-BETH BLP',
        tokenSymbol: MINTTOKEN.AETHMASTER,
        icon: 'macaroon3',
        stakeIcon: 'aeth',
        otherName: 'ANKR + ONX + BAKE',
        bethRoi: 15,
        bakeRoi: 15
    },
    {
        pid: 5,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0x21B712E0A15DE4b0DB343F958aDA7d6Dbc31ba59',
            [ChainId.BSC_MAINNET]: '0xcCFe31Dd6B74b2695a5163a6648d28766323EbC3'
        },
        tokenAddresses: [
            {
                [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
                [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
            },
            {
                [ChainId.BSC_TESTNET]: contractAddresses.ankr[ChainId.BSC_TESTNET],
                [ChainId.BSC_MAINNET]: contractAddresses.ankr[ChainId.BSC_MAINNET]
            },
            {
                [ChainId.BSC_TESTNET]: contractAddresses.onx[ChainId.BSC_TESTNET],
                [ChainId.BSC_MAINNET]: contractAddresses.onx[ChainId.BSC_MAINNET]
            }
        ],
        name: 'Macaroon4',
        symbol: 'AETH-ETH BLP',
        tokenSymbol: MINTTOKEN.AETHMASTER,
        icon: 'macaroon4',
        stakeIcon: 'aeth',
        otherName: 'ANKR + ONX + BAKE',
        bethRoi: 15,
        bakeRoi: 15
    }
]

export const springMasterPools = [
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.tenBakeBLP[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.tenBakeBLP[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.ten[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.ten[ChainId.BSC_MAINNET]
        },
        name: 'Bake to Ten',
        symbol: 'TEN-BAKE BLP',
        tokenSymbol: MINTTOKEN.TEN,
        icon: 'ten1',
        stakeIcon: 'staketen',
        otherName: 'TEN'
        // amountDay: '5000',
        // amountUnit: MINTTOKEN.TEN,
    },
    {
        pid: 2,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.ten[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.ten[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.ten[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.ten[ChainId.BSC_MAINNET]
        },
        name: 'Ten to PET NFT',
        symbol: 'TEN',
        tokenSymbol: MINTTOKEN.TEN,
        icon: 'ten2',
        stakeIcon: 'helmetnft',
        otherName: 'PET NFT',
        amountUnit: 'PET NFT',
        amountDay: '100'
    }
]

export const wSOTEMasterPools = [
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BAKE to wSOTE',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.WSOTE,
        icon: 'wsote',
        stakeIcon: 'bake',
        otherName: 'wSOTE'
    }
]

export const SHIELDMasterPools = [
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BAKE to SHIELD',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.SHIELD,
        icon: 'shield',
        stakeIcon: 'bake',
        otherName: 'SHIELD'
    }
]

export const BRYMasterPools = [
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BAKE to BRY',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.BRY,
        icon: 'bry',
        stakeIcon: 'bake',
        otherName: 'BRY'
    }
]

// bake staking
export const supportedBakeStakingPools = [
    // {
    //   pid: 1,
    //   lpAddresses: {
    //     [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
    //     [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
    //   },
    //   tokenAddresses: {
    //     [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
    //     [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
    //   },
    //   name: 'BAKE to D100',
    //   symbol: 'BAKE',
    //   tokenSymbol: MINTTOKEN.DEFI100,
    //   icon: 'defi100',
    //   stakeIcon: 'bake',
    //   otherName: 'D100'
    // },
    // stake bake earn bake一直放在第一个
    {
        pid: 7,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: '0xe02df9e3e622debdd69fb838bb799e3f168902c5',
            [ChainId.BSC_MAINNET]: '0xe02df9e3e622debdd69fb838bb799e3f168902c5', // 主网生产
            // [ChainId.BSC_MAINNET]: '0x918DE02364E0b63CE83e3741d254D19D8FE8f914', // 主网预生产合约ODO
            1: '0xce84867c3c02b05dc570d0135103d3fb9cc19433'
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'Bread',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.BAKE,
        icon: 'bread'
    },
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BAKE to MX',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.MX,
        icon: 'mx',
        stakeIcon: 'bake',
        otherName: 'MX'
    },
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BAKE to DIESEL',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.DIESEL,
        icon: 'diesel',
        stakeIcon: 'bake',
        otherName: 'DIESEL'
    },
    {
        pid: 2,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BAKE to WAR',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.WAR,
        icon: 'war',
        stakeIcon: 'bake',
        otherName: 'WAR'
    },
    {
        pid: 2,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BAKE to pCWS',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.PCWS,
        icon: 'pcws',
        stakeIcon: 'bake',
        otherName: 'pCWS'
    },
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BAKE to SHIELD',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.SHIELD,
        icon: 'shield',
        stakeIcon: 'bake',
        otherName: 'SHIELD',
        ended: true
    },
    {
        pid: 2,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BAKE to Weapon',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.WEAPON,
        icon: 'bake_weapon',
        stakeIcon: 'bake'
    }
]

export const DEFI100MasterPools = [
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BAKE to D100',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.DEFI100,
        icon: 'defi100',
        stakeIcon: 'bake',
        otherName: 'D100'
    }
]

export const DEFI100OLDMasterPools = [
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'D100(not used)',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.DEFI100OLD,
        icon: 'defi100',
        stakeIcon: 'bake',
        otherName: 'D100'
    }
]

export const BananaMasterPools = [
    {
        pid: 2,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.bakeBananaBlp[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.bakeBananaBlp[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.BANANA[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.BANANA[ChainId.BSC_MAINNET]
        },
        name: 'BANANA',
        symbol: 'BAKE BANANA BLP',
        tokenSymbol: MINTTOKEN.BANANA,
        icon: 'banana',
        stakeIcon: 'banana',
        otherName: 'BANANA'
    }
]

export const seascapeNftPools = [
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.pCWS[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.pCWS[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.pCWS[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.pCWS[ChainId.BSC_MAINNET]
        },
        name: 'CWS NFT Pool',
        symbol: 'pCWS',
        tokenSymbol: MINTTOKEN.SEASCAPENFT,
        icon: 'seascapenft',
        stakeIcon: 'seascapenft',
        otherName: 'SEASCAPE NFT'
    }
]

export const pCWSMasterPools = [
    {
        pid: 2,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BAKE to pCWS',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.PCWS,
        icon: 'pcws',
        stakeIcon: 'bake',
        otherName: 'pCWS'
    }
]

export const warMasterPools = [
    {
        pid: 2,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BAKE to WAR',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.WAR,
        icon: 'war',
        stakeIcon: 'bake',
        otherName: 'WAR'
    }
]

export const war2MasterPools = [
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.busdWarBlp[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.busdWarBlp[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.war[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.war[ChainId.BSC_MAINNET]
        },
        name: 'BUSD-WAR BLP',
        symbol: 'BUSD-WAR BLP',
        tokenSymbol: MINTTOKEN.WAR2,
        icon: 'war',
        stakeIcon: 'bake',
        otherName: 'WAR'
    }
]

export const tokocryptoNftPools = [
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'TKO NFT Pool',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.TKONFT,
        icon: 'tkonft',
        stakeIcon: 'bake',
        otherName: 'TKO NFT'
    }
]

export const dieselPools = [
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BAKE to DIESEL',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.DIESEL,
        icon: 'diesel',
        stakeIcon: 'bake',
        otherName: 'DIESEL'
    },
    {
        pid: 2,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.bnbDieselBlp[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.bnbDieselBlp[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.diesel[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.diesel[ChainId.BSC_MAINNET]
        },
        name: 'BNB-DIESEL BLP',
        symbol: 'BNB-DIESEL BLP',
        tokenSymbol: MINTTOKEN.DIESEL,
        icon: 'diesel',
        stakeIcon: 'bnb_diesel',
        otherName: 'DIESEL'
    }
]

export const mxMasterPools = [
    {
        pid: 1,
        lpAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        tokenAddresses: {
            [ChainId.BSC_TESTNET]: contractAddresses.sushi[ChainId.BSC_TESTNET],
            [ChainId.BSC_MAINNET]: contractAddresses.sushi[ChainId.BSC_MAINNET]
        },
        name: 'BAKE to MX',
        symbol: 'BAKE',
        tokenSymbol: MINTTOKEN.MX,
        icon: 'mx',
        stakeIcon: 'bake',
        otherName: 'MX'
    }
]
