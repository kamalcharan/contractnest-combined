// src/components/playground/SendAnimation.tsx
import React, { useEffect, useState } from 'react';
import { FileText, Check, Send } from 'lucide-react';

interface SendAnimationProps {
  recipientName: string;
  senderName: string;
  onComplete: () => void;
  type: 'contract' | 'rfp' | 'acceptance';
}

const SendAnimation: React.FC<SendAnimationProps> = ({
  recipientName,
  senderName,
  onComplete,
  type,
}) => {
  const [stage, setStage] = useState<'flying' | 'landed' | 'confetti'>('flying');

  useEffect(() => {
    // Flying animation
    const flyTimer = setTimeout(() => setStage('landed'), 1500);

    // Confetti animation
    const confettiTimer = setTimeout(() => setStage('confetti'), 2000);

    // Complete
    const completeTimer = setTimeout(() => onComplete(), 3500);

    return () => {
      clearTimeout(flyTimer);
      clearTimeout(confettiTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  const getMessage = () => {
    switch (type) {
      case 'contract':
        return 'Sending Contract...';
      case 'rfp':
        return 'Sending RFP to Vendors...';
      case 'acceptance':
        return 'Sending Acceptance...';
      default:
        return 'Sending...';
    }
  };

  const getSuccessMessage = () => {
    switch (type) {
      case 'contract':
        return `Contract sent to ${recipientName}!`;
      case 'rfp':
        return 'RFP sent to verified vendors!';
      case 'acceptance':
        return `Acceptance sent to ${recipientName}!`;
      default:
        return 'Sent successfully!';
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900/90 to-indigo-900/90 backdrop-blur-sm z-50 flex items-center justify-center">
      {/* Confetti */}
      {stage === 'confetti' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-20px',
                backgroundColor: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA'][
                  Math.floor(Math.random() * 6)
                ],
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}
        </div>
      )}

      <div className="text-center">
        {/* Flying Paper Animation */}
        <div className="relative h-48 flex items-center justify-center">
          {stage === 'flying' && (
            <>
              {/* Sender */}
              <div className="absolute left-1/4 flex flex-col items-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {senderName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p className="text-white/70 text-sm mt-2">From: {senderName}</p>
              </div>

              {/* Flying Document */}
              <div className="absolute animate-fly-paper">
                <div className="relative">
                  <div className="w-16 h-20 bg-white rounded-lg shadow-2xl flex items-center justify-center transform rotate-12">
                    <FileText className="w-8 h-8 text-indigo-500" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                    <Send className="w-3 h-3 text-white" />
                  </div>
                </div>
              </div>

              {/* Recipient */}
              <div className="absolute right-1/4 flex flex-col items-center opacity-50">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {recipientName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p className="text-white/70 text-sm mt-2">To: {recipientName}</p>
              </div>
            </>
          )}

          {(stage === 'landed' || stage === 'confetti') && (
            <div className="animate-scale-in">
              <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/30">
                <Check className="w-12 h-12 text-white" />
              </div>
            </div>
          )}
        </div>

        {/* Status Text */}
        <div className="mt-8">
          {stage === 'flying' && (
            <div className="animate-pulse">
              <p className="text-2xl font-bold text-white">{getMessage()}</p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {(stage === 'landed' || stage === 'confetti') && (
            <div className="animate-fade-in">
              <p className="text-2xl font-bold text-white">{getSuccessMessage()}</p>
              <p className="text-white/70 mt-2">
                {type === 'contract' && 'They will receive a notification shortly.'}
                {type === 'rfp' && 'You will receive quotes within 24 hours.'}
                {type === 'acceptance' && 'The contract is now active!'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes fly-paper {
          0% {
            transform: translateX(-100px) translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateX(0) translateY(-30px) rotate(15deg) scale(1.1);
            opacity: 1;
          }
          100% {
            transform: translateX(100px) translateY(0) rotate(0deg) scale(0.8);
            opacity: 0;
          }
        }

        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes scale-in {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes fade-in {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fly-paper {
          animation: fly-paper 1.5s ease-in-out forwards;
        }

        .animate-confetti {
          animation: confetti 3s ease-out forwards;
        }

        .animate-scale-in {
          animation: scale-in 0.5s ease-out forwards;
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default SendAnimation;
