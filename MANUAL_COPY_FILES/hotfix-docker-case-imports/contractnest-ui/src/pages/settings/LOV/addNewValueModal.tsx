// src/pages/settings/LOV/AddNewValueModal.tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { useTheme } from '../../../contexts/ThemeContext';

interface AddNewValueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: any) => void;
  categoryId: string;
  existingValues: string[];
}

const AddNewValueModal = ({ isOpen, onClose, onSubmit, categoryId, existingValues }: AddNewValueModalProps) => {
  const { isDarkMode, currentTheme } = useTheme();
  
  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [formData, setFormData] = useState({
    SubCatName: '',
    DisplayName: '',
    hexcolor: '#40E0D0',
    Sequence_no: '',
    Description: '',
    is_active: true,
    is_deletable: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error when field is changed
    if (errors[name]) {
      const newErrors = { ...errors };
      delete newErrors[name];
      setErrors(newErrors);
    }
  };

  const handleColorChange = (color: string) => {
    setFormData({ ...formData, hexcolor: color });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.SubCatName) {
      newErrors.SubCatName = 'Name is required';
    } else if (existingValues.includes(formData.SubCatName)) {
      newErrors.SubCatName = 'This name already exists';
    }
    
    if (!formData.DisplayName) {
      newErrors.DisplayName = 'Display Name is required';
    }
    
    if (!formData.Sequence_no) {
      newErrors.Sequence_no = 'Sequence number is required';
    } else if (isNaN(Number(formData.Sequence_no))) {
      newErrors.Sequence_no = 'Sequence must be a number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    onSubmit({
      ...formData,
      Sequence_no: Number(formData.Sequence_no),
      category_id: categoryId
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[500px] transition-colors"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.utility.primaryText + '20'
        }}
      >
        <DialogHeader>
          <DialogTitle 
            className="transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Add New Value
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label 
                htmlFor="SubCatName"
                className="transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                Name
              </Label>
              <Input
                id="SubCatName"
                name="SubCatName"
                value={formData.SubCatName}
                onChange={handleChange}
                className={errors.SubCatName ? "border-red-500" : ""}
                style={{
                  borderColor: errors.SubCatName 
                    ? colors.semantic.error 
                    : colors.utility.secondaryText + '40',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText
                }}
              />
              {errors.SubCatName && (
                <p 
                  className="text-sm transition-colors"
                  style={{ color: colors.semantic.error }}
                >
                  {errors.SubCatName}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label 
                htmlFor="DisplayName"
                className="transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                Display Name
              </Label>
              <Input
                id="DisplayName"
                name="DisplayName"
                value={formData.DisplayName}
                onChange={handleChange}
                className={errors.DisplayName ? "border-red-500" : ""}
                style={{
                  borderColor: errors.DisplayName 
                    ? colors.semantic.error 
                    : colors.utility.secondaryText + '40',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText
                }}
              />
              {errors.DisplayName && (
                <p 
                  className="text-sm transition-colors"
                  style={{ color: colors.semantic.error }}
                >
                  {errors.DisplayName}
                </p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label 
                htmlFor="hexcolor"
                className="transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                Color
              </Label>
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-full border transition-colors" 
                  style={{ 
                    backgroundColor: formData.hexcolor,
                    borderColor: colors.utility.secondaryText + '40'
                  }}
                ></div>
                <Input
                  id="hexcolor"
                  name="hexcolor"
                  value={formData.hexcolor}
                  onChange={handleChange}
                  type="text"
                  style={{
                    borderColor: colors.utility.secondaryText + '40',
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText
                  }}
                />
                <Input
                  type="color"
                  value={formData.hexcolor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-12 h-8 p-0 border-0"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label 
                htmlFor="Sequence_no"
                className="transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                Sequence
              </Label>
              <Input
                id="Sequence_no"
                name="Sequence_no"
                value={formData.Sequence_no}
                onChange={handleChange}
                type="number"
                className={errors.Sequence_no ? "border-red-500" : ""}
                style={{
                  borderColor: errors.Sequence_no 
                    ? colors.semantic.error 
                    : colors.utility.secondaryText + '40',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText
                }}
              />
              {errors.Sequence_no && (
                <p 
                  className="text-sm transition-colors"
                  style={{ color: colors.semantic.error }}
                >
                  {errors.Sequence_no}
                </p>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label 
              htmlFor="Description"
              className="transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              Description
            </Label>
            <Textarea
              id="Description"
              name="Description"
              value={formData.Description}
              onChange={handleChange}
              rows={3}
              style={{
                borderColor: colors.utility.secondaryText + '40',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText
              }}
            />
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="transition-colors"
              style={{
                borderColor: colors.utility.secondaryText + '40',
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="transition-colors hover:opacity-90"
              style={{
                background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                color: '#FFFFFF',
                borderColor: 'transparent'
              }}
            >
              Add Value
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddNewValueModal;