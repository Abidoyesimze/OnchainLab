"use client";

import React, { useState, useEffect } from 'react';
import { 
  getDetailedVerificationInfo, 
  getNetworkFromChainId,
  type ContractInfo,
  type VerificationResult 
} from '../utils/contractVerification';
import { 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ClipboardDocumentIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

interface ContractVerificationProps {
  contractAddress: string;
  networkChainId: string;
  contractType: 'token' | 'template';
  contractName?: string;
  className?: string;
}

const ContractVerification: React.FC<ContractVerificationProps> = ({
  contractAddress,
  networkChainId,
  contractType,
  contractName,
  className = ""
}) => {
  const [verificationInfo, setVerificationInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

  const network = getNetworkFromChainId(networkChainId);

  useEffect(() => {
    if (contractAddress && network) {
      checkVerificationStatus();
    }
  }, [contractAddress, network]);

  const checkVerificationStatus = async () => {
    if (!network) return;
    
    setIsLoading(true);
    try {
      const contractInfo: ContractInfo = {
        address: contractAddress,
        network,
        contractType
      };
      
      const info = await getDetailedVerificationInfo(contractInfo);
      setVerificationInfo(info);
    } catch (error) {
      console.error('Error checking verification status:', error);
      toast.error('Failed to check verification status');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  if (!network) {
    return (
      <div className={`p-4 bg-amber-900/20 rounded-lg border border-amber-500/30 ${className}`}>
        <div className="flex items-center gap-2 text-amber-400">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <span className="text-sm">Unsupported network for verification</span>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`p-4 bg-blue-900/20 rounded-lg border border-blue-500/30 ${className}`}>
        <div className="flex items-center gap-2 text-blue-400">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
          <span className="text-sm">Checking verification status...</span>
        </div>
      </div>
    );
  }

  if (!verificationInfo) {
    return (
      <div className={`p-4 bg-gray-900/20 rounded-lg border border-gray-500/30 ${className}`}>
        <div className="flex items-center gap-2 text-gray-400">
          <InformationCircleIcon className="h-5 w-5" />
          <span className="text-sm">Unable to load verification information</span>
        </div>
      </div>
    );
  }

  const { status, network: networkInfo } = verificationInfo;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Verification Status */}
      <div className={`p-4 rounded-lg border ${
        status.success 
          ? 'bg-green-900/20 border-green-500/30' 
          : 'bg-amber-900/20 border-amber-500/30'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {status.success ? (
              <CheckCircleIcon className="h-6 w-6 text-green-400" />
            ) : (
              <ExclamationTriangleIcon className="h-6 w-6 text-amber-400" />
            )}
            <div>
              <h3 className="font-semibold text-white">
                {status.success ? 'Contract Verified' : 'Contract Not Verified'}
              </h3>
              <p className="text-sm text-gray-300">
                {status.message}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => copyToClipboard(contractAddress, 'Contract address')}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              title="Copy contract address"
            >
              <ClipboardDocumentIcon className="h-4 w-4 text-gray-300" />
            </button>
            {status.explorerUrl && (
              <a
                href={status.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                title="View on explorer"
              >
                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Contract Information */}
      <div className="p-4 bg-[#0f1a2e] rounded-lg border border-[#1e2a3a]">
        <h4 className="font-semibold text-white mb-3">Contract Information</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Address:</span>
            <code className="text-emerald-400 font-mono text-xs">
              {contractAddress.slice(0, 10)}...{contractAddress.slice(-8)}
            </code>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Network:</span>
            <span className="text-white">{networkInfo.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Type:</span>
            <span className="text-white capitalize">{contractType}</span>
          </div>
          {contractName && (
            <div className="flex justify-between">
              <span className="text-gray-400">Name:</span>
              <span className="text-white">{contractName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {!status.success && (
        <div className="space-y-3">
          <div className="flex gap-3">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              <DocumentTextIcon className="h-5 w-5" />
              {showGuide ? 'Hide' : 'Show'} Verification Guide
            </button>
            <button
              onClick={() => setShowChecklist(!showChecklist)}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <CheckCircleIcon className="h-5 w-5" />
              {showChecklist ? 'Hide' : 'Show'} Checklist
            </button>
          </div>

          {status.verificationUrl && (
            <a
              href={status.verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open Verification Page
            </a>
          )}
        </div>
      )}

      {/* Verification Guide */}
      {showGuide && verificationInfo.guide && (
        <div className="p-4 bg-[#0f1a2e] rounded-lg border border-[#1e2a3a]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-white">Verification Guide</h4>
            <button
              onClick={() => copyToClipboard(verificationInfo.guide, 'Verification guide')}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              title="Copy guide"
            >
              <ClipboardDocumentIcon className="h-4 w-4 text-gray-300" />
            </button>
          </div>
          <div className="prose prose-invert max-w-none">
            <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto">
              {verificationInfo.guide}
            </pre>
          </div>
        </div>
      )}

      {/* Verification Checklist */}
      {showChecklist && verificationInfo.checklist && (
        <div className="p-4 bg-[#0f1a2e] rounded-lg border border-[#1e2a3a]">
          <h4 className="font-semibold text-white mb-3">Verification Checklist</h4>
          <div className="space-y-2">
            {verificationInfo.checklist.map((item: string, index: number) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex items-center justify-center">
                  <span className="text-xs text-gray-400">{index + 1}</span>
                </div>
                <span className="text-sm text-gray-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Benefits Section */}
      <div className="p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-lg border border-[#2a3b54]">
        <h4 className="font-semibold text-amber-400 mb-3">Why Verify Your Contract?</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-300">
          <div className="space-y-2">
            <div>✅ <strong>Transparency:</strong> Source code is publicly visible</div>
            <div>✅ <strong>Trust:</strong> Users can verify functionality</div>
          </div>
          <div className="space-y-2">
            <div>✅ <strong>Integration:</strong> Easier tool integration</div>
            <div>✅ <strong>Security:</strong> Community can audit code</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractVerification;
