// AddItemModal — reusable modal for adding variants, parts, checkpoints, values, cycles
import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

export interface ModalField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number';
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  showWhen?: { field: string; value: string };
}

interface Props {
  title: string;
  fields: ModalField[];
  onClose: () => void;
  onSave: (data: Record<string, string>) => void;
  colors: any;
  initialData?: Record<string, string>;
}

const AddItemModal: React.FC<Props> = ({ title, fields, onClose, onSave, colors, initialData }) => {
  const [formData, setFormData] = useState<Record<string, string>>(initialData || {});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setValidationErrors([]);
  };

  const handleSubmit = () => {
    const visibleFields = fields.filter((f) => {
      if (!f.showWhen) return true;
      return formData[f.showWhen.field] === f.showWhen.value;
    });
    const missing = visibleFields.filter((f) => f.required && !formData[f.key]?.trim());
    if (missing.length > 0) {
      setValidationErrors(missing.map((f) => f.label));
      return;
    }
    onSave(formData);
  };

  const brandPrimary = colors.brand.primary;

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    border: `1px solid ${colors.utility.secondaryText}25`,
    borderRadius: '8px', fontFamily: 'inherit', fontSize: '13px',
    color: colors.utility.primaryText,
    background: colors.utility.primaryBackground,
    outline: 'none',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: '480px', background: colors.utility.secondaryBackground, border: `1px solid ${colors.utility.secondaryText}15`, borderRadius: '14px', boxShadow: '0 20px 60px rgba(0,0,0,.12)', animation: 'fadeInUp .25s ease' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${colors.utility.secondaryText}15` }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: colors.utility.primaryText }}>{title}</h3>
          <button onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: colors.utility.primaryBackground, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.utility.secondaryText }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Validation error */}
        {validationErrors.length > 0 && (
          <div style={{ margin: '12px 20px 0', padding: '8px 12px', borderRadius: '8px', background: colors.semantic.error + '10', border: `1px solid ${colors.semantic.error}25`, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: colors.semantic.error }} />
            <span style={{ fontSize: '12px', color: colors.semantic.error }}>
              Required: {validationErrors.join(', ')}
            </span>
          </div>
        )}

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {fields.map((field) => {
            // Conditional visibility
            if (field.showWhen && formData[field.showWhen.field] !== field.showWhen.value) return null;

            const hasError = validationErrors.includes(field.label);
            return (
              <div key={field.key}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: hasError ? colors.semantic.error : colors.utility.secondaryText, marginBottom: '4px' }}>
                  {field.label} {field.required && <span style={{ color: colors.semantic.error }}>*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    placeholder={field.placeholder}
                    value={formData[field.key] || ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    style={{ ...inputStyle, resize: 'vertical' as const, minHeight: '72px', borderColor: hasError ? colors.semantic.error : undefined }}
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={formData[field.key] || ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer', borderColor: hasError ? colors.semantic.error : undefined }}
                  >
                    <option value="">Select...</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={formData[field.key] || ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    style={{ ...inputStyle, borderColor: hasError ? colors.semantic.error : undefined }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', padding: '16px 20px', borderTop: `1px solid ${colors.utility.secondaryText}15` }}>
          <button onClick={onClose} style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, background: colors.utility.primaryBackground, color: colors.utility.secondaryText, border: `1px solid ${colors.utility.secondaryText}20`, cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, background: `linear-gradient(135deg, ${brandPrimary}, ${colors.brand.secondary || brandPrimary})`, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 2px 8px ${brandPrimary}40` }}>
            {initialData ? 'Save' : 'Add'}
          </button>
        </div>
      </div>
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  );
};

export default AddItemModal;
