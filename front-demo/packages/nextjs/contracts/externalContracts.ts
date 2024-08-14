import { GenericContractsDeclaration } from "~~/utils/scaffold-eth/contract";

const externalContracts = {
  8008135: {
    AdMatcher: {
      address: "0x14BEca5CFb732b8F454e72939A6fC08001F0bD84",
      abi: [
        {
          inputs: [],
          stateMutability: "nonpayable",
          type: "constructor",
        },
        {
          inputs: [],
          name: "ECDSAInvalidSignature",
          type: "error",
        },
        {
          inputs: [
            {
              internalType: "uint256",
              name: "length",
              type: "uint256",
            },
          ],
          name: "ECDSAInvalidSignatureLength",
          type: "error",
        },
        {
          inputs: [
            {
              internalType: "bytes32",
              name: "s",
              type: "bytes32",
            },
          ],
          name: "ECDSAInvalidSignatureS",
          type: "error",
        },
        {
          inputs: [],
          name: "InvalidShortString",
          type: "error",
        },
        {
          inputs: [],
          name: "SignerNotMessageSender",
          type: "error",
        },
        {
          inputs: [],
          name: "SignerNotOwner",
          type: "error",
        },
        {
          inputs: [
            {
              internalType: "string",
              name: "str",
              type: "string",
            },
          ],
          name: "StringTooLong",
          type: "error",
        },
        {
          anonymous: false,
          inputs: [],
          name: "EIP712DomainChanged",
          type: "event",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: "uint32",
              name: "",
              type: "uint32",
            },
            {
              indexed: false,
              internalType: "bytes32",
              name: "",
              type: "bytes32",
            },
            {
              indexed: false,
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
            {
              indexed: false,
              internalType: "string",
              name: "",
              type: "string",
            },
          ],
          name: "Received",
          type: "event",
        },
        {
          inputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          name: "adMatrix",
          outputs: [
            {
              internalType: "bool",
              name: "",
              type: "bool",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "bool[]",
              name: "ad",
              type: "bool[]",
            },
          ],
          name: "addAd",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "bool[]",
              name: "userVector",
              type: "bool[]",
            },
          ],
          name: "addUserVector",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [],
          name: "eip712Domain",
          outputs: [
            {
              internalType: "bytes1",
              name: "fields",
              type: "bytes1",
            },
            {
              internalType: "string",
              name: "name",
              type: "string",
            },
            {
              internalType: "string",
              name: "version",
              type: "string",
            },
            {
              internalType: "uint256",
              name: "chainId",
              type: "uint256",
            },
            {
              internalType: "address",
              name: "verifyingContract",
              type: "address",
            },
            {
              internalType: "bytes32",
              name: "salt",
              type: "bytes32",
            },
            {
              internalType: "uint256[]",
              name: "extensions",
              type: "uint256[]",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              components: [
                {
                  internalType: "bytes32",
                  name: "publicKey",
                  type: "bytes32",
                },
                {
                  internalType: "bytes",
                  name: "signature",
                  type: "bytes",
                },
              ],
              internalType: "struct Permission",
              name: "permission",
              type: "tuple",
            },
          ],
          name: "findBestAdFromSenderAddress",
          outputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              components: [
                {
                  internalType: "bytes",
                  name: "data",
                  type: "bytes",
                },
              ],
              internalType: "struct inEbool[]",
              name: "encryptedUserVector",
              type: "tuple[]",
            },
            {
              components: [
                {
                  internalType: "bytes32",
                  name: "publicKey",
                  type: "bytes32",
                },
                {
                  internalType: "bytes",
                  name: "signature",
                  type: "bytes",
                },
              ],
              internalType: "struct Permission",
              name: "permission",
              type: "tuple",
            },
          ],
          name: "findBestAdPermitSealed",
          outputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              components: [
                {
                  internalType: "bytes32",
                  name: "publicKey",
                  type: "bytes32",
                },
                {
                  internalType: "bytes",
                  name: "signature",
                  type: "bytes",
                },
              ],
              internalType: "struct Permission",
              name: "permission",
              type: "tuple",
            },
          ],
          name: "findBestAdPermitSealedFromSenderAddress",
          outputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "sender",
              type: "address",
            },
          ],
          name: "findBestAdPermitSealedFromSenderAddressWithoutPermit",
          outputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "getAdsCount",
          outputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "user",
              type: "address",
            },
          ],
          name: "getUserVector",
          outputs: [
            {
              internalType: "bool[]",
              name: "",
              type: "bool[]",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint32",
              name: "_origin",
              type: "uint32",
            },
            {
              internalType: "bytes32",
              name: "_sender",
              type: "bytes32",
            },
            {
              internalType: "bytes",
              name: "_data",
              type: "bytes",
            },
          ],
          name: "handle",
          outputs: [],
          stateMutability: "payable",
          type: "function",
        },
        {
          inputs: [],
          name: "owner",
          outputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          name: "userVectors",
          outputs: [
            {
              internalType: "ebool",
              name: "",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
      ],
    },
  },
  534351: {
    AdContract: {
      address: "0xf048a8B6eCff4B9c53f3B58227e6fCc68bf79940",
      abi: [
        {
          inputs: [
            {
              internalType: "address",
              name: "mailboxAddress",
              type: "address",
            },
            {
              internalType: "uint32",
              name: "_destinationChain",
              type: "uint32",
            },
          ],
          stateMutability: "nonpayable",
          type: "constructor",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: "uint256",
              name: "adId",
              type: "uint256",
            },
            {
              indexed: true,
              internalType: "address",
              name: "advertiser",
              type: "address",
            },
            {
              indexed: false,
              internalType: "string",
              name: "websiteUrl",
              type: "string",
            },
            {
              indexed: false,
              internalType: "string",
              name: "imageUrl",
              type: "string",
            },
            {
              indexed: false,
              internalType: "uint256",
              name: "expiresAt",
              type: "uint256",
            },
            {
              indexed: false,
              internalType: "bool[5]",
              name: "adVector",
              type: "bool[5]",
            },
            {
              indexed: false,
              internalType: "bytes32",
              name: "channelMessageId",
              type: "bytes32",
            },
            {
              indexed: false,
              internalType: "address",
              name: "recipient",
              type: "address",
            },
            {
              indexed: false,
              internalType: "uint32",
              name: "destinationChain",
              type: "uint32",
            },
          ],
          name: "AdCreated",
          type: "event",
        },
        {
          inputs: [],
          name: "COST_PER_SECOND",
          outputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          name: "ads",
          outputs: [
            {
              internalType: "address payable",
              name: "advertiser",
              type: "address",
            },
            {
              internalType: "string",
              name: "websiteUrl",
              type: "string",
            },
            {
              internalType: "string",
              name: "imageUrl",
              type: "string",
            },
            {
              internalType: "uint256",
              name: "createdAt",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "expiresAt",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "string",
              name: "websiteUrl",
              type: "string",
            },
            {
              internalType: "string",
              name: "imageUrl",
              type: "string",
            },
            {
              internalType: "uint256",
              name: "durationInSeconds",
              type: "uint256",
            },
            {
              internalType: "bool[5]",
              name: "adVector",
              type: "bool[5]",
            },
            {
              internalType: "address",
              name: "recipient",
              type: "address",
            },
          ],
          name: "createAd",
          outputs: [
            {
              internalType: "bytes32",
              name: "",
              type: "bytes32",
            },
          ],
          stateMutability: "payable",
          type: "function",
        },
        {
          inputs: [],
          name: "mailbox",
          outputs: [
            {
              internalType: "contract IMailbox",
              name: "",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "nextAdId",
          outputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "owner",
          outputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          stateMutability: "payable",
          type: "receive",
        },
      ],
    },
  },
} as const;

export default externalContracts satisfies GenericContractsDeclaration;
