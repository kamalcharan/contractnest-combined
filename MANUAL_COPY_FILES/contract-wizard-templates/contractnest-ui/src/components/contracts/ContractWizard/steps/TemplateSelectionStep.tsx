// src/components/contracts/ContractWizard/steps/TemplateSelectionStep.tsx
// Step 1a: Template Selection - Shows templates or empty state with Lottie
import React from 'react';
import Lottie from 'lottie-react';
import { LayoutTemplate, PenLine, Search, ArrowRight } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

// Custom Lottie animation for "No Templates" empty state
// Creates an animated document with magnifying glass
const emptyTemplatesAnimation = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 90,
  w: 200,
  h: 200,
  nm: "Empty Templates",
  ddd: 0,
  assets: [],
  layers: [
    // Floating documents in background
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "Doc 1",
      sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [30], e: [50] }, { t: 45, s: [50], e: [30] }, { t: 90, s: [30] }] },
        r: { a: 1, k: [{ t: 0, s: [-5], e: [5] }, { t: 45, s: [5], e: [-5] }, { t: 90, s: [-5] }] },
        p: { a: 1, k: [{ t: 0, s: [50, 70], e: [50, 60] }, { t: 45, s: [50, 60], e: [50, 70] }, { t: 90, s: [50, 70] }] },
        a: { a: 0, k: [0, 0] },
        s: { a: 0, k: [80, 80] }
      },
      shapes: [
        {
          ty: "gr",
          it: [
            { ty: "rc", d: 1, s: { a: 0, k: [30, 40] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 4 }, nm: "Doc" },
            { ty: "st", c: { a: 0, k: [0.6, 0.6, 0.7, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 2 }, lc: 2, lj: 2, nm: "Stroke" },
            { ty: "fl", c: { a: 0, k: [0.95, 0.95, 0.97, 1] }, o: { a: 0, k: 100 }, nm: "Fill" },
            { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }
          ],
          nm: "Doc Group"
        }
      ]
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: "Doc 2",
      sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [40], e: [60] }, { t: 45, s: [60], e: [40] }, { t: 90, s: [40] }] },
        r: { a: 1, k: [{ t: 0, s: [5], e: [-5] }, { t: 45, s: [-5], e: [5] }, { t: 90, s: [5] }] },
        p: { a: 1, k: [{ t: 0, s: [150, 80], e: [150, 70] }, { t: 45, s: [150, 70], e: [150, 80] }, { t: 90, s: [150, 80] }] },
        a: { a: 0, k: [0, 0] },
        s: { a: 0, k: [70, 70] }
      },
      shapes: [
        {
          ty: "gr",
          it: [
            { ty: "rc", d: 1, s: { a: 0, k: [30, 40] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 4 }, nm: "Doc" },
            { ty: "st", c: { a: 0, k: [0.6, 0.6, 0.7, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 2 }, lc: 2, lj: 2, nm: "Stroke" },
            { ty: "fl", c: { a: 0, k: [0.95, 0.95, 0.97, 1] }, o: { a: 0, k: 100 }, nm: "Fill" },
            { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }
          ],
          nm: "Doc Group"
        }
      ]
    },
    // Main document (center)
    {
      ddd: 0,
      ind: 3,
      ty: 4,
      nm: "Main Doc",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 1, k: [{ t: 0, s: [100, 105], e: [100, 95] }, { t: 45, s: [100, 95], e: [100, 105] }, { t: 90, s: [100, 105] }] },
        a: { a: 0, k: [0, 0] },
        s: { a: 0, k: [100, 100] }
      },
      shapes: [
        {
          ty: "gr",
          it: [
            { ty: "rc", d: 1, s: { a: 0, k: [50, 65] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 6 }, nm: "Doc" },
            { ty: "st", c: { a: 0, k: [0.31, 0.27, 0.9, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 3 }, lc: 2, lj: 2, nm: "Stroke" },
            { ty: "fl", c: { a: 0, k: [1, 1, 1, 1] }, o: { a: 0, k: 100 }, nm: "Fill" },
            { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }
          ],
          nm: "Doc Group"
        },
        // Lines on document
        {
          ty: "gr",
          it: [
            { ty: "rc", d: 1, s: { a: 0, k: [30, 4] }, p: { a: 0, k: [0, -18] }, r: { a: 0, k: 2 }, nm: "Line1" },
            { ty: "fl", c: { a: 0, k: [0.85, 0.85, 0.9, 1] }, o: { a: 0, k: 100 }, nm: "Fill" },
            { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }
          ],
          nm: "Line 1"
        },
        {
          ty: "gr",
          it: [
            { ty: "rc", d: 1, s: { a: 0, k: [30, 4] }, p: { a: 0, k: [0, -8] }, r: { a: 0, k: 2 }, nm: "Line2" },
            { ty: "fl", c: { a: 0, k: [0.85, 0.85, 0.9, 1] }, o: { a: 0, k: 100 }, nm: "Fill" },
            { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }
          ],
          nm: "Line 2"
        },
        {
          ty: "gr",
          it: [
            { ty: "rc", d: 1, s: { a: 0, k: [20, 4] }, p: { a: 0, k: [-5, 2] }, r: { a: 0, k: 2 }, nm: "Line3" },
            { ty: "fl", c: { a: 0, k: [0.85, 0.85, 0.9, 1] }, o: { a: 0, k: 100 }, nm: "Fill" },
            { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }
          ],
          nm: "Line 3"
        }
      ]
    },
    // Magnifying glass with search animation
    {
      ddd: 0,
      ind: 4,
      ty: 4,
      nm: "Magnifier",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 1, k: [{ t: 0, s: [-15], e: [15] }, { t: 45, s: [15], e: [-15] }, { t: 90, s: [-15] }] },
        p: { a: 1, k: [{ t: 0, s: [130, 130], e: [135, 125] }, { t: 45, s: [135, 125], e: [130, 130] }, { t: 90, s: [130, 130] }] },
        a: { a: 0, k: [0, 0] },
        s: { a: 0, k: [100, 100] }
      },
      shapes: [
        // Glass circle
        {
          ty: "gr",
          it: [
            { ty: "el", d: 1, s: { a: 0, k: [35, 35] }, p: { a: 0, k: [0, 0] }, nm: "Glass" },
            { ty: "st", c: { a: 0, k: [0.31, 0.27, 0.9, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 4 }, lc: 2, lj: 2, nm: "Stroke" },
            { ty: "fl", c: { a: 0, k: [0.31, 0.27, 0.9, 0.1] }, o: { a: 0, k: 30 }, nm: "Fill" },
            { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }
          ],
          nm: "Glass Group"
        },
        // Handle
        {
          ty: "gr",
          it: [
            { ty: "rc", d: 1, s: { a: 0, k: [6, 18] }, p: { a: 0, k: [22, 22] }, r: { a: 0, k: 3 }, nm: "Handle" },
            { ty: "fl", c: { a: 0, k: [0.31, 0.27, 0.9, 1] }, o: { a: 0, k: 100 }, nm: "Fill" },
            { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 45 }, o: { a: 0, k: 100 } }
          ],
          nm: "Handle Group"
        }
      ]
    },
    // Question mark or "?" indicator
    {
      ddd: 0,
      ind: 5,
      ty: 4,
      nm: "Question",
      sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [0], e: [100] }, { t: 15, s: [100], e: [100] }, { t: 75, s: [100], e: [0] }, { t: 90, s: [0] }] },
        r: { a: 0, k: 0 },
        p: { a: 1, k: [{ t: 0, s: [100, 50], e: [100, 45] }, { t: 45, s: [100, 45], e: [100, 50] }, { t: 90, s: [100, 50] }] },
        a: { a: 0, k: [0, 0] },
        s: { a: 1, k: [{ t: 0, s: [0, 0], e: [100, 100] }, { t: 15, s: [100, 100], e: [100, 100] }, { t: 75, s: [100, 100], e: [0, 0] }, { t: 90, s: [0, 0] }] }
      },
      shapes: [
        {
          ty: "gr",
          it: [
            { ty: "el", d: 1, s: { a: 0, k: [24, 24] }, p: { a: 0, k: [0, 0] }, nm: "Circle" },
            { ty: "fl", c: { a: 0, k: [1, 0.8, 0.2, 1] }, o: { a: 0, k: 100 }, nm: "Fill" },
            { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }
          ],
          nm: "Circle Group"
        }
      ]
    }
  ]
};

interface Template {
  id: string;
  name: string;
  description: string;
  blocksCount: number;
  category: string;
}

interface TemplateSelectionStepProps {
  templates: Template[];
  selectedTemplateId: string | null;
  onSelectTemplate: (templateId: string) => void;
  onSwitchToScratch: () => void;
  isLoading?: boolean;
}

const TemplateSelectionStep: React.FC<TemplateSelectionStepProps> = ({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onSwitchToScratch,
  isLoading = false,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Empty state when no templates exist
  if (!isLoading && templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        {/* Lottie Animation */}
        <div className="relative mb-6">
          <Lottie
            animationData={emptyTemplatesAnimation}
            loop={true}
            style={{
              width: 200,
              height: 200,
              filter: isDarkMode ? 'brightness(0.9)' : 'none',
            }}
          />
        </div>

        {/* Empty State Text */}
        <h2
          className="text-2xl font-bold mb-3 text-center"
          style={{ color: colors.utility.primaryText }}
        >
          No Templates Yet
        </h2>
        <p
          className="text-sm text-center max-w-md mb-8"
          style={{ color: colors.utility.secondaryText }}
        >
          You haven't created any contract templates yet. Templates help you quickly create
          contracts with pre-configured service blocks.
        </p>

        {/* Action Cards */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
          {/* Continue to Scratch */}
          <button
            onClick={onSwitchToScratch}
            className="flex-1 flex items-center justify-between p-5 rounded-xl border-2 transition-all hover:shadow-lg group"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: colors.brand.primary,
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${colors.brand.primary}15` }}
              >
                <PenLine
                  className="w-6 h-6"
                  style={{ color: colors.brand.primary }}
                />
              </div>
              <div className="text-left">
                <p
                  className="font-semibold"
                  style={{ color: colors.utility.primaryText }}
                >
                  Create from Scratch
                </p>
                <p
                  className="text-xs"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Build your contract manually
                </p>
              </div>
            </div>
            <ArrowRight
              className="w-5 h-5 transition-transform group-hover:translate-x-1"
              style={{ color: colors.brand.primary }}
            />
          </button>
        </div>

        {/* Hint to create templates */}
        <p
          className="text-xs mt-8 text-center max-w-sm"
          style={{ color: colors.utility.secondaryText }}
        >
          💡 Tip: Visit{' '}
          <span style={{ color: colors.brand.primary }} className="font-medium">
            Catalog Studio → Templates
          </span>{' '}
          to create reusable contract templates.
        </p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div
          className="w-12 h-12 border-4 rounded-full animate-spin mb-4"
          style={{
            borderColor: `${colors.brand.primary}20`,
            borderTopColor: colors.brand.primary,
          }}
        />
        <p style={{ color: colors.utility.secondaryText }}>
          Loading templates...
        </p>
      </div>
    );
  }

  // Template grid when templates exist
  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2
          className="text-2xl font-bold mb-2"
          style={{ color: colors.utility.primaryText }}
        >
          Choose a Template
        </h2>
        <p
          className="text-sm"
          style={{ color: colors.utility.secondaryText }}
        >
          Select a template to pre-fill your contract with service blocks
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md mx-auto">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
          style={{ color: colors.utility.secondaryText }}
        />
        <input
          type="text"
          placeholder="Search templates..."
          className="w-full pl-12 pr-4 py-3 rounded-xl border text-sm outline-none transition-all focus:ring-2"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}15`,
            color: colors.utility.primaryText,
          }}
        />
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => {
          const isSelected = selectedTemplateId === template.id;
          return (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template.id)}
              className="flex flex-col p-5 rounded-xl border-2 text-left transition-all hover:shadow-md"
              style={{
                backgroundColor: isSelected
                  ? `${colors.brand.primary}08`
                  : colors.utility.secondaryBackground,
                borderColor: isSelected
                  ? colors.brand.primary
                  : `${colors.utility.primaryText}15`,
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: isSelected
                      ? colors.brand.primary
                      : `${colors.brand.primary}15`,
                  }}
                >
                  <LayoutTemplate
                    className="w-5 h-5"
                    style={{
                      color: isSelected ? 'white' : colors.brand.primary,
                    }}
                  />
                </div>
                {/* Selection indicator */}
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                  style={{
                    borderColor: isSelected
                      ? colors.brand.primary
                      : `${colors.utility.primaryText}30`,
                    backgroundColor: isSelected
                      ? colors.brand.primary
                      : 'transparent',
                  }}
                >
                  {isSelected && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </div>
              <h3
                className="font-semibold mb-1"
                style={{ color: colors.utility.primaryText }}
              >
                {template.name}
              </h3>
              <p
                className="text-xs mb-3 line-clamp-2"
                style={{ color: colors.utility.secondaryText }}
              >
                {template.description}
              </p>
              <div className="flex items-center gap-2 mt-auto">
                <span
                  className="text-xs px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: `${colors.brand.primary}15`,
                    color: colors.brand.primary,
                  }}
                >
                  {template.blocksCount} blocks
                </span>
                <span
                  className="text-xs"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {template.category}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Switch to scratch option */}
      <div className="mt-8 text-center">
        <button
          onClick={onSwitchToScratch}
          className="inline-flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-80"
          style={{ color: colors.brand.primary }}
        >
          <PenLine className="w-4 h-4" />
          Or create from scratch instead
        </button>
      </div>
    </div>
  );
};

export default TemplateSelectionStep;
