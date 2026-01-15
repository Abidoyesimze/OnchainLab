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
  InformationCircleIcon,
  ArrowTopRightOnSquareIcon
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
    <div className={`space-y-3 ${className}`}>
      {/* Verification Info - Simplified and Optional */}
      <div className="p-4 bg-blue-900/10 rounded-lg border border-blue-500/20">
        <div className="flex items-start gap-3">
          <InformationCircleIcon className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-blue-400 mb-1">Verify Your Token (Optional)</h4>
            <p className="text-xs text-gray-400 mb-3">
              Verifying your token contract on Mantlescan makes the source code publicly visible, building trust and transparency with your users.
            </p>
            {status.verificationUrl && (
              <a
                href={status.verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                Verify on Mantlescan
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible Verification Guide - Only show if user wants it */}
      {showGuide && (
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
            <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto max-h-60 overflow-y-auto">
              {verificationInfo.guide}
            </pre>
          </div>
        </div>
      )}

      {/* Show Guide Button - Only if guide is hidden */}
      {!showGuide && (
        <button
          onClick={() => setShowGuide(true)}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
        >
          <DocumentTextIcon className="h-4 w-4" />
          Show Verification Guide
        </button>
      )}
    </div>
  );
};

export default ContractVerification;
