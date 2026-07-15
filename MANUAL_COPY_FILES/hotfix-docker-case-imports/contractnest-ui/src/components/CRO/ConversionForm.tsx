// src/components/CRO/ConversionForm.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCRO } from '../../hooks/useCRO';
import { CROUtils } from '../../utils/helpers/cro.utils';
import { ConversionFormData } from '../../types/cro.types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { AlertCircle, CheckCircle, Loader2, Shield, Clock, Users } from 'lucide-react';

// Form validation schema
const conversionFormSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  companyName: z.string()
    .min(2, 'Company name must be at least 2 characters')
    .optional(),
  phone: z.string()
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number')
    .optional(),
  industry: z.string().optional(),
  contractsCount: z.string().optional(),
  agreeToTerms: z.boolean()
    .refine(val => val === true, 'You must agree to the terms and conditions')
});

type FormData = z.infer<typeof conversionFormSchema>;

interface ConversionFormProps {
  variant?: 'hero' | 'sidebar' | 'modal' | 'footer';
  title?: string;
  subtitle?: string;
  ctaText?: string;
  showTrustSignals?: boolean;
  showOptionalFields?: boolean;
  onSuccess?: (data: ConversionFormData & { leadScore: number }) => void;
  onError?: (error: string) => void;
  className?: string;
  source?: string; // Track form source for analytics
}

const ConversionForm: React.FC<ConversionFormProps> = ({
  variant = 'hero',
  title,
  subtitle,
  ctaText,
  showTrustSignals = true,
  showOptionalFields = true,
  onSuccess,
  onError,
  className = '',
  source = 'unknown'
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [leadScore, setLeadScore] = useState<number>(0);
  const [formStartTime] = useState(Date.now());
  const formRef = useRef<HTMLFormElement>(null);
  
  const { trackConversion, trackFormInteraction, calculateLeadScore, sessionId, utmData } = useCRO();
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
    reset
  } = useForm<FormData>({
    resolver: zodResolver(conversionFormSchema),
    mode: 'onChange'
  });

  const watchedFields = watch();

  // Industry options
  const industries = [
    { value: 'healthcare', label: 'Healthcare/Medical' },
    { value: 'manufacturing', label: 'Manufacturing/OEM' },
    { value: 'hvac', label: 'HVAC/Maintenance' },
    { value: 'consulting', label: 'Consulting/Professional Services' },
    { value: 'technology', label: 'Technology/Software' },
    { value: 'food', label: 'Food & Hospitality' },
    { value: 'other', label: 'Other' }
  ];

  const contractCounts = [
    { value: '1-10', label: '1-10 contracts' },
    { value: '11-25', label: '11-25 contracts' },
    { value: '26-50', label: '26-50 contracts' },
    { value: '51-100', label: '51-100 contracts' },
    { value: '100+', label: '100+ contracts' }
  ];

  // Calculate lead score in real-time
  useEffect(() => {
    if (watchedFields.email || watchedFields.companyName) {
      const score = calculateLeadScore({
        email: watchedFields.email || '',
        companyName: watchedFields.companyName,
        phone: watchedFields.phone,
        industry: watchedFields.industry,
        contractsCount: watchedFields.contractsCount,
        ...utmData
      });
      setLeadScore(score);
    }
  }, [watchedFields, calculateLeadScore, utmData]);

  // Track form interactions
  const handleFieldInteraction = useCallback((fieldName: string, action: 'focus' | 'blur' | 'change') => {
    trackFormInteraction(`conversion_form_${variant}`, fieldName, action);
  }, [trackFormInteraction, variant]);

  // Form submission handler
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Calculate form completion time
      const formCompletionTime = Date.now() - formStartTime;
      
      // Prepare form data with UTM and session info
      const formData: ConversionFormData = {
        email: data.email,
        companyName: data.companyName,
        phone: data.phone,
        industry: data.industry,
        contractsCount: data.contractsCount,
        ...utmData,
        referrer: document.referrer
      };

      const finalLeadScore = calculateLeadScore(formData);

      // Track conversion
      trackConversion({
        eventName: 'lead_generated',
        eventCategory: 'conversion',
        eventLabel: `${variant}_form_${source}`,
        value: finalLeadScore,
        customParameters: {
          form_variant: variant,
          form_source: source,
          lead_score: finalLeadScore,
          completion_time_seconds: Math.round(formCompletionTime / 1000),
          has_company_name: !!data.companyName,
          has_phone: !!data.phone,
          has_industry: !!data.industry,
          has_contract_count: !!data.contractsCount,
          is_business_email: CROUtils.isBusinessEmail(data.email),
          session_id: sessionId
        }
      });

      // Simulate API call (replace with actual API)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Success callback
      onSuccess?.({
        ...formData,
        leadScore: finalLeadScore
      });

      // Reset form
      reset();
      setLeadScore(0);

      // Track successful submission
      trackConversion({
        eventName: 'form_submit_success',
        eventCategory: 'conversion',
        eventLabel: `${variant}_form_success`,
        value: finalLeadScore
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred. Please try again.';
      setSubmitError(errorMessage);
      onError?.(errorMessage);

      // Track form error
      trackConversion({
        eventName: 'form_submit_error',
        eventCategory: 'error',
        eventLabel: `${variant}_form_error`,
        customParameters: {
          error_message: errorMessage
        }
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get optimized titles and CTA text based on variant
  const getContent = () => {
    const content = {
      hero: {
        title: title || 'Transform Your Service Contracts Today',
        subtitle: subtitle || 'Join 500+ businesses automating their service agreements with ContractNest',
        cta: ctaText || CROUtils.getOptimizedCTAText('hero', watchedFields.industry)
      },
      sidebar: {
        title: title || 'Get Your Free Demo',
        subtitle: subtitle || 'See how ContractNest works for your industry',
        cta: ctaText || 'Request Demo'
      },
      modal: {
        title: title || 'Start Your Free Trial',
        subtitle: subtitle || 'Setup takes less than 5 minutes',
        cta: ctaText || 'Get Started'
      },
      footer: {
        title: title || 'Ready to Get Started?',
        subtitle: subtitle || 'Join the waitlist for early access',
        cta: ctaText || 'Join Waitlist'
      }
    };

    return content[variant];
  };

  const content = getContent();

  // Form styling based on variant
  const getFormStyles = () => {
    const styles = {
      hero: 'bg-white p-8 rounded-2xl shadow-2xl border border-gray-100 max-w-md',
      sidebar: 'bg-gray-50 p-6 rounded-xl border border-gray-200',
      modal: 'bg-white p-6 rounded-lg',
      footer: 'bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-xl border border-red-200'
    };
    return styles[variant];
  };

  return (
    <div className={`${getFormStyles()} ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{content.title}</h3>
        {content.subtitle && (
          <p className="text-gray-600 text-sm">{content.subtitle}</p>
        )}
      </div>

      {/* Trust signals */}
      {showTrustSignals && (
        <div className="mb-6 flex items-center justify-center space-x-6 text-sm text-gray-500">
          <div className="flex items-center">
            <Shield className="w-4 h-4 mr-1 text-green-500" />
            <span>Secure</span>
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1 text-blue-500" />
            <span>5 min setup</span>
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-1 text-purple-500" />
            <span>500+ users</span>
          </div>
        </div>
      )}

      {/* Form */}
      <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Field */}
        <div>
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">
            Business Email *
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            {...register('email')}
            onFocus={() => handleFieldInteraction('email', 'focus')}
            onBlur={() => handleFieldInteraction('email', 'blur')}
            onChange={(e) => {
              register('email').onChange(e);
              handleFieldInteraction('email', 'change');
            }}
            className={`mt-1 ${errors.email ? 'border-red-500 ring-red-500' : ''}`}
          />
          {errors.email && (
            <div className="flex items-center mt-1 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.email.message}
            </div>
          )}
          {watchedFields.email && CROUtils.isBusinessEmail(watchedFields.email) && (
            <div className="flex items-center mt-1 text-sm text-green-600">
              <CheckCircle className="w-4 h-4 mr-1" />
              Business email detected
            </div>
          )}
        </div>

        {/* Company Name Field */}
        <div>
          <Label htmlFor="companyName" className="text-sm font-medium text-gray-700">
            Company Name {showOptionalFields ? '' : '*'}
          </Label>
          <Input
            id="companyName"
            type="text"
            placeholder="Your company name"
            {...register('companyName')}
            onFocus={() => handleFieldInteraction('companyName', 'focus')}
            onBlur={() => handleFieldInteraction('companyName', 'blur')}
            onChange={(e) => {
              register('companyName').onChange(e);
              handleFieldInteraction('companyName', 'change');
            }}
            className={`mt-1 ${errors.companyName ? 'border-red-500 ring-red-500' : ''}`}
          />
          {errors.companyName && (
            <div className="flex items-center mt-1 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.companyName.message}
            </div>
          )}
        </div>

        {/* Optional Fields */}
        {showOptionalFields && (
          <>
            {/* Phone Field */}
            <div>
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 98765 43210"
                {...register('phone')}
                onFocus={() => handleFieldInteraction('phone', 'focus')}
                onBlur={() => handleFieldInteraction('phone', 'blur')}
                onChange={(e) => {
                  register('phone').onChange(e);
                  handleFieldInteraction('phone', 'change');
                }}
                className={`mt-1 ${errors.phone ? 'border-red-500 ring-red-500' : ''}`}
              />
              {errors.phone && (
                <div className="flex items-center mt-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.phone.message}
                </div>
              )}
            </div>

            {/* Industry Field */}
            <div>
              <Label htmlFor="industry" className="text-sm font-medium text-gray-700">
                Industry
              </Label>
              <Select onValueChange={(value) => {
                setValue('industry', value);
                handleFieldInteraction('industry', 'change');
              }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  {industries.map((industry) => (
                    <SelectItem key={industry.value} value={industry.value}>
                      {industry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contract Count Field */}
            <div>
              <Label htmlFor="contractsCount" className="text-sm font-medium text-gray-700">
                Number of Service Contracts
              </Label>
              <Select onValueChange={(value) => {
                setValue('contractsCount', value);
                handleFieldInteraction('contractsCount', 'change');
              }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select contract volume" />
                </SelectTrigger>
                <SelectContent>
                  {contractCounts.map((count) => (
                    <SelectItem key={count.value} value={count.value}>
                      {count.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Terms and Conditions */}
        <div className="flex items-start space-x-2">
          <Checkbox
            id="agreeToTerms"
            {...register('agreeToTerms')}
            onCheckedChange={(checked) => {
              setValue('agreeToTerms', checked as boolean);
              handleFieldInteraction('agreeToTerms', 'change');
            }}
            className={errors.agreeToTerms ? 'border-red-500' : ''}
          />
          <Label 
            htmlFor="agreeToTerms" 
            className="text-xs text-gray-600 leading-tight cursor-pointer"
          >
            I agree to ContractNest's{' '}
            <a href="/terms" className="text-red-600 hover:underline" target="_blank">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-red-600 hover:underline" target="_blank">
              Privacy Policy
            </a>
          </Label>
        </div>
        {errors.agreeToTerms && (
          <div className="flex items-center text-sm text-red-600">
            <AlertCircle className="w-4 h-4 mr-1" />
            {errors.agreeToTerms.message}
          </div>
        )}

        {/* Lead Score Indicator (only show if score > 0) */}
        {leadScore > 0 && process.env.NODE_ENV === 'development' && (
          <div className="bg-blue-50 p-2 rounded text-sm text-blue-700">
            Lead Score: {leadScore}/100
          </div>
        )}

        {/* Submit Error */}
        {submitError && (
          <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            {submitError}
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting || !isValid}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </div>
          ) : (
            content.cta
          )}
        </Button>

        {/* Footer text */}
        <p className="text-xs text-center text-gray-500 mt-4">
          Free demo • No credit card required • Setup in 5 minutes
        </p>
      </form>
    </div>
  );
};

// Pre-configured form variants for easy use
export const HeroConversionForm: React.FC<Omit<ConversionFormProps, 'variant'>> = (props) => (
  <ConversionForm {...props} variant="hero" source="hero_section" />
);

export const SidebarConversionForm: React.FC<Omit<ConversionFormProps, 'variant'>> = (props) => (
  <ConversionForm {...props} variant="sidebar" source="sidebar" showOptionalFields={false} />
);

export const ModalConversionForm: React.FC<Omit<ConversionFormProps, 'variant'>> = (props) => (
  <ConversionForm {...props} variant="modal" source="modal_popup" />
);

export const FooterConversionForm: React.FC<Omit<ConversionFormProps, 'variant'>> = (props) => (
  <ConversionForm {...props} variant="footer" source="footer_cta" showOptionalFields={false} />
);

export default ConversionForm;