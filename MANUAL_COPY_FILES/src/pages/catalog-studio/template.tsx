// src/pages/catalog-studio/template.tsx
import React from 'react';
import { LayoutTemplate, Plus, ArrowRight } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const CatalogStudioTemplatePage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  return (
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F9FAFB' }}
    >
      {/* Top Bar */}
      <div
        className="border-b px-6 py-4 flex justify-between items-center"
        style={{
          backgroundColor: colors.utility.primaryBackground,
          borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'
        }}
      >
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: colors.utility.primaryText }}
          >
            Template Builder
          </h1>
          <p
            className="text-sm"
            style={{ color: colors.utility.secondaryText }}
          >
            Combine blocks to create contract templates
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 transition-colors"
            style={{ backgroundColor: colors.brand.primary }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.brand.secondary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.brand.primary;
            }}
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-lg text-center">
          <div
            className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-6"
            style={{ backgroundColor: `${colors.brand.primary}20` }}
          >
            <LayoutTemplate className="w-10 h-10" style={{ color: colors.brand.primary }} />
          </div>
          <h2
            className="text-2xl font-bold mb-3"
            style={{ color: colors.utility.primaryText }}
          >
            Template Builder Coming Soon
          </h2>
          <p
            className="mb-8"
            style={{ color: colors.utility.secondaryText }}
          >
            Drag and drop blocks from your library to create reusable contract templates.
            Templates can be shared with your team and used to quickly create new contracts.
          </p>

          <div
            className="rounded-xl border p-6 text-left"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'
            }}
          >
            <h3
              className="font-semibold mb-4"
              style={{ color: colors.utility.primaryText }}
            >
              How it will work:
            </h3>
            <div className="space-y-4">
              {[
                { num: 1, title: 'Select Blocks', desc: 'Choose service, billing, and clause blocks from your library' },
                { num: 2, title: 'Arrange & Configure', desc: 'Drag blocks into sections and customize their settings' },
                { num: 3, title: 'Save & Use', desc: 'Save the template and use it to create contracts instantly' },
              ].map((step) => (
                <div key={step.num} className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{
                      backgroundColor: `${colors.brand.primary}20`,
                      color: colors.brand.primary
                    }}
                  >
                    {step.num}
                  </div>
                  <div>
                    <div className="font-medium" style={{ color: colors.utility.primaryText }}>{step.title}</div>
                    <div className="text-sm" style={{ color: colors.utility.secondaryText }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <a
              href="/catalog-studio/configure"
              className="inline-flex items-center gap-2 font-medium transition-colors"
              style={{ color: colors.brand.primary }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = colors.brand.secondary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = colors.brand.primary;
              }}
            >
              Start by creating blocks in Configure
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CatalogStudioTemplatePage;
