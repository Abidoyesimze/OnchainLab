"use client";

import React from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  DocumentTextIcon,
  CodeBracketIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

const ContractVerificationGuide = () => {
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#121d33] text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-white">
            Contract Verification Guide
          </h1>
          <p className="text-xl text-gray-300">
            Learn how to verify your smart contracts on ETN and Somnia testnets
          </p>
        </div>

        {/* Overview */}
        <div className="bg-[#1c2941] rounded-xl p-8 mb-8 border border-[#2a3b54] shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <ShieldCheckIcon className="h-8 w-8 text-emerald-400" />
            <h2 className="text-2xl font-bold text-emerald-400">What is Contract Verification?</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-3 text-white">Why Verify?</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Transparency:</strong> Source code is publicly visible</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Trust:</strong> Users can verify contract functionality</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Security:</strong> Community can audit the code</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Integration:</strong> Easier integration with other tools</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-3 text-white">What Gets Verified?</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <CodeBracketIcon className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <span>Contract source code</span>
                </li>
                <li className="flex items-start gap-2">
                  <CodeBracketIcon className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <span>Compiler settings</span>
                </li>
                <li className="flex items-start gap-2">
                  <CodeBracketIcon className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <span>Constructor arguments</span>
                </li>
                <li className="flex items-start gap-2">
                  <CodeBracketIcon className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <span>Bytecode matching</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Network Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* ETN Testnet */}
          <div className="bg-[#1c2941] rounded-xl p-6 border border-[#2a3b54] shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <h3 className="text-xl font-bold text-blue-400">ETN Testnet</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Chain ID:</span>
                <span className="text-white font-mono">5201420</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Explorer:</span>
                <a 
                  href="https://testnet-blockexplorer.electroneum.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  ETN Explorer
                </a>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">RPC URL:</span>
                <button
                  onClick={() => copyToClipboard('https://testnet-rpc.electroneum.com', 'RPC URL')}
                  className="text-blue-400 hover:underline"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>

          {/* Somnia Testnet */}
          <div className="bg-[#1c2941] rounded-xl p-6 border border-[#2a3b54] shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <h3 className="text-xl font-bold text-purple-400">Somnia Testnet</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Chain ID:</span>
                <span className="text-white font-mono">50312</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Explorer:</span>
                <a 
                  href="https://shannon-explorer.somnia.network" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:underline"
                >
                  Somnia Explorer
                </a>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">RPC URL:</span>
                <button
                  onClick={() => copyToClipboard('https://shannon-explorer.somnia.network', 'RPC URL')}
                  className="text-purple-400 hover:underline"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Step-by-Step Guide */}
        <div className="bg-[#1c2941] rounded-xl p-8 mb-8 border border-[#2a3b54] shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <DocumentTextIcon className="h-8 w-8 text-emerald-400" />
            <h2 className="text-2xl font-bold text-emerald-400">Step-by-Step Verification Guide</h2>
          </div>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Deploy Your Contract</h3>
                <p className="text-gray-300 mb-3">
                  First, deploy your contract using OnchainLab's Token Factory or Contract Templates. 
                  Make sure to save the contract address and deployment transaction hash.
                </p>
                <div className="bg-[#0f1a2e] p-3 rounded-lg border border-[#1e2a3a]">
                  <code className="text-emerald-400 text-sm">
                    Contract Address: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
                  </code>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Visit the Block Explorer</h3>
                <p className="text-gray-300 mb-3">
                  Navigate to the appropriate block explorer for your network and search for your contract address.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <a
                    href="https://testnet-blockexplorer.electroneum.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    <GlobeAltIcon className="h-5 w-5" />
                    <span>ETN Explorer</span>
                    <ArrowTopRightOnSquareIcon className="h-4 w-4 ml-auto" />
                  </a>
                  <a
                    href="https://shannon-explorer.somnia.network"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                  >
                    <GlobeAltIcon className="h-5 w-5" />
                    <span>Somnia Explorer</span>
                    <ArrowTopRightOnSquareIcon className="h-4 w-4 ml-auto" />
                  </a>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Click "Verify & Publish"</h3>
                <p className="text-gray-300 mb-3">
                  On the contract page, look for the "Verify & Publish" button in the contract tab. 
                  Click it to start the verification process.
                </p>
                <div className="bg-amber-900/20 p-3 rounded-lg border border-amber-500/30">
                  <div className="flex items-center gap-2 text-amber-400">
                    <ExclamationTriangleIcon className="h-5 w-5" />
                    <span className="text-sm">Make sure you're on the correct network!</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                4
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Select Verification Method</h3>
                <p className="text-gray-300 mb-3">
                  Choose "Via Standard JSON Input" for the easiest verification process. 
                  This method allows you to upload the complete contract source code.
                </p>
                <div className="bg-[#0f1a2e] p-3 rounded-lg border border-[#1e2a3a]">
                  <div className="text-sm text-gray-300">
                    <strong>Recommended:</strong> Via Standard JSON Input<br/>
                    <strong>Alternative:</strong> Via flattened source code
                  </div>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                5
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Upload Source Code</h3>
                <p className="text-gray-300 mb-3">
                  Upload the contract source code. For OnchainLab contracts, you can find the source code 
                  in the verification guide provided after deployment.
                </p>
                <div className="bg-[#0f1a2e] p-3 rounded-lg border border-[#1e2a3a]">
                  <div className="text-sm text-gray-300">
                    <strong>File format:</strong> .sol (Solidity source file)<br/>
                    <strong>Size limit:</strong> Usually 1MB or less
                  </div>
                </div>
              </div>
            </div>

            {/* Step 6 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                6
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Configure Compiler Settings</h3>
                <p className="text-gray-300 mb-3">
                  Enter the correct compiler settings that match your deployment:
                </p>
                <div className="bg-[#0f1a2e] p-3 rounded-lg border border-[#1e2a3a]">
                  <div className="text-sm text-gray-300 space-y-1">
                    <div><strong>Compiler Version:</strong> v0.8.19+commit.7dd6d404</div>
                    <div><strong>Optimization:</strong> Enabled (200 runs)</div>
                    <div><strong>EVM Version:</strong> default</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 7 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                7
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Submit for Verification</h3>
                <p className="text-gray-300 mb-3">
                  Review all settings and click "Verify & Publish". The verification process usually takes 
                  a few minutes to complete.
                </p>
                <div className="bg-green-900/20 p-3 rounded-lg border border-green-500/30">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircleIcon className="h-5 w-5" />
                    <span className="text-sm">Verification successful! Your contract is now verified.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-[#1c2941] rounded-xl p-8 mb-8 border border-[#2a3b54] shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <ExclamationTriangleIcon className="h-8 w-8 text-amber-400" />
            <h2 className="text-2xl font-bold text-amber-400">Troubleshooting Common Issues</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-red-900/20 rounded-lg border border-red-500/30">
                <h4 className="font-semibold text-red-400 mb-2">"Already Verified"</h4>
                <p className="text-sm text-gray-300">
                  Your contract is already verified. Check the contract tab to see the source code.
                </p>
              </div>
              
              <div className="p-4 bg-red-900/20 rounded-lg border border-red-500/30">
                <h4 className="font-semibold text-red-400 mb-2">"Compilation Error"</h4>
                <p className="text-sm text-gray-300">
                  Check that the compiler version and settings match your deployment exactly.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-red-900/20 rounded-lg border border-red-500/30">
                <h4 className="font-semibold text-red-400 mb-2">"Constructor Arguments"</h4>
                <p className="text-sm text-gray-300">
                  Ensure constructor arguments match exactly what was used during deployment.
                </p>
              </div>
              
              <div className="p-4 bg-red-900/20 rounded-lg border border-red-500/30">
                <h4 className="font-semibold text-red-400 mb-2">"Bytecode Mismatch"</h4>
                <p className="text-sm text-gray-300">
                  The source code doesn't match the deployed bytecode. Double-check your source code.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Best Practices */}
        <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-xl p-8 border border-[#2a3b54]">
          <h2 className="text-2xl font-bold text-emerald-400 mb-6">Best Practices</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-3 text-white">Before Deployment</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• Test your contract thoroughly</li>
                <li>• Use consistent compiler settings</li>
                <li>• Document constructor arguments</li>
                <li>• Keep source code organized</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-3 text-white">After Deployment</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• Verify immediately after deployment</li>
                <li>• Save verification transaction hash</li>
                <li>• Test verified contract functions</li>
                <li>• Share verified contract address</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractVerificationGuide;
