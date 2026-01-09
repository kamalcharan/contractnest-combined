// src/pages/public/PlaygroundPage.tsx
// Playground - Interactive Demo for ContractNest
import React, { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import PlaygroundWelcome from '../../components/playground/PlaygroundWelcome';
import LeadCaptureForm from '../../components/playground/LeadCaptureForm';
import SellerBuilder from '../../components/playground/SellerBuilder';
import BuyerJourney from '../../components/playground/BuyerJourney';
import SendAnimation from '../../components/playground/SendAnimation';
import SuccessModal from '../../components/playground/SuccessModal';
import {
  PlaygroundStep,
  PersonaType,
  PlaygroundLead,
  ContractData,
  RFPData,
  VendorQuote,
} from '../../components/playground/types';
import { supabase } from '../../utils/supabase';

const PlaygroundPage: React.FC = () => {
  // State management
  const [step, setStep] = useState<PlaygroundStep>('welcome');
  const [persona, setPersona] = useState<PersonaType | null>(null);
  const [lead, setLead] = useState<PlaygroundLead | null>(null);

  // Seller flow state
  const [contractData, setContractData] = useState<ContractData | null>(null);

  // Buyer flow state
  const [rfpData, setRfpData] = useState<RFPData | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<VendorQuote | null>(null);

  // Animation state
  const [showSendAnimation, setShowSendAnimation] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [animationType, setAnimationType] = useState<'contract' | 'rfp' | 'acceptance'>('contract');

  // Handle persona selection
  const handleSelectPersona = useCallback((selectedPersona: PersonaType) => {
    setPersona(selectedPersona);
    setStep('lead-capture');
  }, []);

  // Handle lead form submission
  const handleLeadSubmit = useCallback((leadData: PlaygroundLead) => {
    setLead(leadData);
    setStep('builder');
  }, []);

  // Handle back to welcome
  const handleBackToWelcome = useCallback(() => {
    setPersona(null);
    setStep('welcome');
  }, []);

  // Handle back to lead capture
  const handleBackToLeadCapture = useCallback(() => {
    setStep('lead-capture');
  }, []);

  // Seller: Handle send contract
  const handleSendContract = useCallback((data: ContractData) => {
    setContractData(data);
    setAnimationType('contract');
    setShowSendAnimation(true);
  }, []);

  // Buyer: Handle accept vendor
  const handleAcceptVendor = useCallback((vendor: VendorQuote, rfp: RFPData) => {
    setSelectedVendor(vendor);
    setRfpData(rfp);
    setAnimationType('acceptance');
    setShowSendAnimation(true);
  }, []);

  // Handle animation complete
  const handleAnimationComplete = useCallback(async () => {
    setShowSendAnimation(false);
    setShowSuccessModal(true);

    // Mark demo as completed in Supabase
    if (lead?.id) {
      try {
        await supabase
          .from('leads_contractnest')
          .update({
            completed_demo: true,
            contract_data: persona === 'seller' ? contractData : { rfpData, selectedVendor },
          })
          .eq('id', lead.id);
      } catch (err) {
        console.error('Error updating lead:', err);
      }
    }
  }, [lead, persona, contractData, rfpData, selectedVendor]);

  // Handle restart
  const handleRestart = useCallback(() => {
    setStep('welcome');
    setPersona(null);
    setLead(null);
    setContractData(null);
    setRfpData(null);
    setSelectedVendor(null);
    setShowSuccessModal(false);
  }, []);

  // Handle close success modal (go to landing)
  const handleCloseSuccessModal = useCallback(() => {
    setShowSuccessModal(false);
    // Optionally redirect to landing page
    // window.location.href = '/';
  }, []);

  return (
    <>
      <Helmet>
        <title>Playground - ContractNest Demo</title>
        <meta
          name="description"
          content="Experience ContractNest's contract management platform with our interactive demo. Create contracts as a seller or RFPs as a buyer."
        />
      </Helmet>

      {/* Main Content */}
      {step === 'welcome' && (
        <PlaygroundWelcome onSelectPersona={handleSelectPersona} />
      )}

      {step === 'lead-capture' && persona && (
        <LeadCaptureForm
          persona={persona}
          onBack={handleBackToWelcome}
          onSubmit={handleLeadSubmit}
        />
      )}

      {step === 'builder' && lead && persona === 'seller' && (
        <SellerBuilder
          lead={lead}
          onBack={handleBackToLeadCapture}
          onSendContract={handleSendContract}
        />
      )}

      {step === 'builder' && lead && persona === 'buyer' && (
        <BuyerJourney
          lead={lead}
          onBack={handleBackToLeadCapture}
          onAcceptVendor={handleAcceptVendor}
        />
      )}

      {/* Send Animation Overlay */}
      {showSendAnimation && (
        <SendAnimation
          recipientName={
            persona === 'seller'
              ? contractData?.customerName || 'Customer'
              : selectedVendor?.vendorName || 'Vendor'
          }
          senderName={lead?.name || 'You'}
          type={animationType}
          onComplete={handleAnimationComplete}
        />
      )}

      {/* Success Modal */}
      {showSuccessModal && persona && (
        <SuccessModal
          persona={persona}
          contractData={contractData || undefined}
          rfpData={rfpData || undefined}
          selectedVendor={selectedVendor || undefined}
          onRestart={handleRestart}
          onClose={handleCloseSuccessModal}
        />
      )}
    </>
  );
};

export default PlaygroundPage;
