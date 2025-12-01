// src/components/VaNi/bbb/SemanticClustersForm.tsx
// Semantic Clusters Form with AI generation and manual entry

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  Sparkles,
  Plus,
  Trash2,
  Save,
  Edit3,
  Check,
  X,
  Tag,
  Loader2,
  Brain,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

// Types
export interface SemanticCluster {
  id?: string;
  membership_id?: string;
  primary_term: string;
  related_terms: string[];
  category: string;
  confidence_score?: number;
  is_active?: boolean;
  isNew?: boolean; // For UI tracking of manually added clusters
  isEditing?: boolean; // For UI tracking of edit mode
}

interface SemanticClustersFormProps {
  membershipId: string;
  profileText: string;
  keywords: string[];
  existingClusters?: SemanticCluster[];
  onGenerateClusters: (profileText: string, keywords: string[]) => Promise<SemanticCluster[]>;
  onSaveClusters: (clusters: SemanticCluster[]) => Promise<void>;
  isGenerating?: boolean;
  isSaving?: boolean;
}

// Category options
const CATEGORY_OPTIONS = [
  'Technology',
  'Healthcare',
  'Services',
  'Manufacturing',
  'Trading',
  'Education',
  'Finance',
  'Real Estate',
  'Retail',
  'Hospitality',
  'Consulting',
  'Other'
];

const SemanticClustersForm: React.FC<SemanticClustersFormProps> = ({
  membershipId,
  profileText,
  keywords,
  existingClusters = [],
  onGenerateClusters,
  onSaveClusters,
  isGenerating = false,
  isSaving = false
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // State
  const [clusters, setClusters] = useState<SemanticCluster[]>(existingClusters);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedCluster, setExpandedCluster] = useState<number | null>(null);
  const [editingCluster, setEditingCluster] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<SemanticCluster | null>(null);
  const [newTermInput, setNewTermInput] = useState('');

  // Initialize with existing clusters
  useEffect(() => {
    if (existingClusters.length > 0) {
      setClusters(existingClusters);
    }
  }, [existingClusters]);

  // Handle AI generation
  const handleGenerateClusters = async () => {
    try {
      const generatedClusters = await onGenerateClusters(profileText, keywords);

      // Merge with existing (keep manually added ones)
      const manualClusters = clusters.filter(c => c.isNew);
      const mergedClusters = [...generatedClusters, ...manualClusters];

      setClusters(mergedClusters);
      setHasChanges(true);

      toast.success(`Generated ${generatedClusters.length} clusters!`, {
        style: { background: colors.semantic.success, color: '#FFF' }
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate clusters', {
        style: { background: colors.semantic.error, color: '#FFF' }
      });
    }
  };

  // Handle adding a new manual cluster
  const handleAddManualCluster = () => {
    const newCluster: SemanticCluster = {
      primary_term: '',
      related_terms: [],
      category: 'Services',
      confidence_score: 1.0,
      isNew: true,
      isEditing: true
    };

    setClusters([...clusters, newCluster]);
    setEditingCluster(clusters.length);
    setEditForm(newCluster);
    setExpandedCluster(clusters.length);
    setHasChanges(true);
  };

  // Handle editing a cluster
  const handleEditCluster = (index: number) => {
    setEditingCluster(index);
    setEditForm({ ...clusters[index] });
    setExpandedCluster(index);
  };

  // Handle saving cluster edit
  const handleSaveEdit = (index: number) => {
    if (!editForm) return;

    // Validate
    if (!editForm.primary_term.trim()) {
      toast.error('Primary term is required', {
        style: { background: colors.semantic.error, color: '#FFF' }
      });
      return;
    }

    const updatedClusters = [...clusters];
    updatedClusters[index] = { ...editForm, isEditing: false };

    setClusters(updatedClusters);
    setEditingCluster(null);
    setEditForm(null);
    setHasChanges(true);
  };

  // Handle canceling edit
  const handleCancelEdit = (index: number) => {
    // If it's a new cluster with no primary term, remove it
    if (clusters[index].isNew && !clusters[index].primary_term.trim()) {
      const updatedClusters = clusters.filter((_, i) => i !== index);
      setClusters(updatedClusters);
    }

    setEditingCluster(null);
    setEditForm(null);
  };

  // Handle deleting a cluster
  const handleDeleteCluster = (index: number) => {
    const updatedClusters = clusters.filter((_, i) => i !== index);
    setClusters(updatedClusters);
    setHasChanges(true);

    if (editingCluster === index) {
      setEditingCluster(null);
      setEditForm(null);
    }
  };

  // Handle adding a related term
  const handleAddRelatedTerm = () => {
    if (!editForm || !newTermInput.trim()) return;

    const term = newTermInput.trim().toLowerCase();
    if (editForm.related_terms.includes(term)) {
      toast.error('Term already exists', {
        style: { background: colors.semantic.warning, color: '#FFF' }
      });
      return;
    }

    setEditForm({
      ...editForm,
      related_terms: [...editForm.related_terms, term]
    });
    setNewTermInput('');
  };

  // Handle removing a related term
  const handleRemoveRelatedTerm = (termIndex: number) => {
    if (!editForm) return;

    setEditForm({
      ...editForm,
      related_terms: editForm.related_terms.filter((_, i) => i !== termIndex)
    });
  };

  // Handle saving all clusters
  const handleSaveAllClusters = async () => {
    // Validate all clusters have primary terms
    const invalidClusters = clusters.filter(c => !c.primary_term.trim());
    if (invalidClusters.length > 0) {
      toast.error('All clusters must have a primary term', {
        style: { background: colors.semantic.error, color: '#FFF' }
      });
      return;
    }

    // Validate at least one cluster
    if (clusters.length === 0) {
      toast.error('Add at least one cluster before saving', {
        style: { background: colors.semantic.error, color: '#FFF' }
      });
      return;
    }

    try {
      // Prepare clusters for saving (remove UI-only properties)
      const clustersToSave = clusters.map(c => ({
        membership_id: membershipId,
        primary_term: c.primary_term.trim(),
        related_terms: c.related_terms,
        category: c.category,
        confidence_score: c.confidence_score || 1.0,
        is_active: true
      }));

      await onSaveClusters(clustersToSave);
      setHasChanges(false);

      // Update local state to remove isNew flags
      setClusters(clusters.map(c => ({ ...c, isNew: false })));

    } catch (error: any) {
      toast.error(error.message || 'Failed to save clusters', {
        style: { background: colors.semantic.error, color: '#FFF' }
      });
    }
  };

  // Toggle cluster expansion
  const toggleExpand = (index: number) => {
    setExpandedCluster(expandedCluster === index ? null : index);
  };

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-lg"
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        border: `1px solid ${colors.utility.primaryText}15`
      }}
    >
      {/* Header */}
      <div
        className="p-6"
        style={{
          background: `linear-gradient(135deg, ${colors.brand.primary}10 0%, ${colors.brand.secondary}10 100%)`,
          borderBottom: `1px solid ${colors.utility.primaryText}10`
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Brain className="w-6 h-6" style={{ color: colors.brand.primary }} />
            <div>
              <h2 className="text-xl font-bold" style={{ color: colors.utility.primaryText }}>
                Semantic Clusters
              </h2>
              <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                AI-powered search optimization for your profile
              </p>
            </div>
          </div>

          {/* Cluster count badge */}
          {clusters.length > 0 && (
            <div
              className="px-3 py-1 rounded-full text-sm font-medium"
              style={{
                backgroundColor: `${colors.semantic.success}15`,
                color: colors.semantic.success
              }}
            >
              {clusters.length} cluster{clusters.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-6 border-b" style={{ borderColor: `${colors.utility.primaryText}10` }}>
        <div className="flex flex-wrap gap-3">
          {/* Generate with AI Button */}
          <button
            onClick={handleGenerateClusters}
            disabled={isGenerating || !profileText}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
              color: '#FFF'
            }}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Generate Clusters with AI</span>
              </>
            )}
          </button>

          {/* Add Manual Cluster Button */}
          <button
            onClick={handleAddManualCluster}
            disabled={isGenerating}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-lg font-medium transition-all hover:opacity-80"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              border: `1px solid ${colors.utility.primaryText}20`
            }}
          >
            <Plus className="w-5 h-5" />
            <span>Add Custom Cluster</span>
          </button>

          {/* Regenerate Button (if clusters exist) */}
          {clusters.length > 0 && (
            <button
              onClick={handleGenerateClusters}
              disabled={isGenerating}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-lg font-medium transition-all hover:opacity-80"
              style={{
                backgroundColor: `${colors.semantic.info}15`,
                color: colors.semantic.info
              }}
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>Regenerate</span>
            </button>
          )}
        </div>

        {/* Info text */}
        {!profileText && (
          <div
            className="mt-3 flex items-center space-x-2 text-sm"
            style={{ color: colors.semantic.warning }}
          >
            <AlertCircle className="w-4 h-4" />
            <span>Save your profile first to generate clusters</span>
          </div>
        )}
      </div>

      {/* Clusters List */}
      <div className="p-6 space-y-4">
        {clusters.length === 0 ? (
          <div
            className="text-center py-12 rounded-lg"
            style={{ backgroundColor: colors.utility.primaryBackground }}
          >
            <Brain
              className="w-16 h-16 mx-auto mb-4 opacity-30"
              style={{ color: colors.utility.secondaryText }}
            />
            <p className="text-lg font-medium mb-2" style={{ color: colors.utility.primaryText }}>
              No clusters yet
            </p>
            <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
              Generate clusters with AI or add them manually
            </p>
          </div>
        ) : (
          clusters.map((cluster, index) => (
            <div
              key={index}
              className="rounded-xl overflow-hidden transition-all"
              style={{
                backgroundColor: colors.utility.primaryBackground,
                border: `1px solid ${editingCluster === index ? colors.brand.primary : colors.utility.primaryText}20`
              }}
            >
              {/* Cluster Header */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => editingCluster !== index && toggleExpand(index)}
              >
                <div className="flex items-center space-x-3 flex-1">
                  <Tag
                    className="w-5 h-5"
                    style={{ color: cluster.isNew ? colors.semantic.info : colors.brand.primary }}
                  />

                  {editingCluster === index ? (
                    <input
                      type="text"
                      value={editForm?.primary_term || ''}
                      onChange={(e) => setEditForm(prev => prev ? { ...prev, primary_term: e.target.value } : null)}
                      placeholder="Primary term (e.g., 'accounting')"
                      className="flex-1 px-3 py-1.5 rounded-lg text-base font-medium"
                      style={{
                        backgroundColor: colors.utility.secondaryBackground,
                        color: colors.utility.primaryText,
                        border: `1px solid ${colors.brand.primary}40`
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <span className="font-semibold" style={{ color: colors.utility.primaryText }}>
                      {cluster.primary_term || 'New Cluster'}
                    </span>
                  )}

                  {cluster.isNew && (
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: `${colors.semantic.info}15`,
                        color: colors.semantic.info
                      }}
                    >
                      Custom
                    </span>
                  )}

                  {cluster.confidence_score && !cluster.isNew && (
                    <span
                      className="px-2 py-0.5 rounded text-xs"
                      style={{
                        backgroundColor: `${colors.semantic.success}15`,
                        color: colors.semantic.success
                      }}
                    >
                      {Math.round(cluster.confidence_score * 100)}% confidence
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {/* Category Badge */}
                  {!editingCluster && cluster.category && (
                    <span
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{
                        backgroundColor: `${colors.brand.secondary}15`,
                        color: colors.brand.secondary
                      }}
                    >
                      {cluster.category}
                    </span>
                  )}

                  {/* Action Buttons */}
                  {editingCluster === index ? (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSaveEdit(index); }}
                        className="p-2 rounded-lg transition-all hover:opacity-80"
                        style={{ backgroundColor: `${colors.semantic.success}15`, color: colors.semantic.success }}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCancelEdit(index); }}
                        className="p-2 rounded-lg transition-all hover:opacity-80"
                        style={{ backgroundColor: `${colors.semantic.error}15`, color: colors.semantic.error }}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditCluster(index); }}
                        className="p-2 rounded-lg transition-all hover:opacity-80"
                        style={{ backgroundColor: `${colors.semantic.info}15`, color: colors.semantic.info }}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteCluster(index); }}
                        className="p-2 rounded-lg transition-all hover:opacity-80"
                        style={{ backgroundColor: `${colors.semantic.error}15`, color: colors.semantic.error }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {expandedCluster === index ? (
                        <ChevronUp className="w-5 h-5" style={{ color: colors.utility.secondaryText }} />
                      ) : (
                        <ChevronDown className="w-5 h-5" style={{ color: colors.utility.secondaryText }} />
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              {(expandedCluster === index || editingCluster === index) && (
                <div
                  className="px-4 pb-4 pt-0 space-y-4"
                  style={{ borderTop: `1px solid ${colors.utility.primaryText}10` }}
                >
                  {/* Category Selector (in edit mode) */}
                  {editingCluster === index && (
                    <div className="pt-4">
                      <label
                        className="block text-sm font-medium mb-2"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        Category
                      </label>
                      <select
                        value={editForm?.category || 'Services'}
                        onChange={(e) => setEditForm(prev => prev ? { ...prev, category: e.target.value } : null)}
                        className="w-full px-3 py-2 rounded-lg"
                        style={{
                          backgroundColor: colors.utility.secondaryBackground,
                          color: colors.utility.primaryText,
                          border: `1px solid ${colors.utility.primaryText}20`
                        }}
                      >
                        {CATEGORY_OPTIONS.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Related Terms */}
                  <div className="pt-2">
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      Related Terms ({editingCluster === index ? editForm?.related_terms.length : cluster.related_terms.length})
                    </label>

                    <div className="flex flex-wrap gap-2">
                      {(editingCluster === index ? editForm?.related_terms : cluster.related_terms)?.map((term, termIndex) => (
                        <span
                          key={termIndex}
                          className="inline-flex items-center px-3 py-1.5 rounded-full text-sm"
                          style={{
                            backgroundColor: `${colors.brand.primary}10`,
                            color: colors.brand.primary
                          }}
                        >
                          {term}
                          {editingCluster === index && (
                            <button
                              onClick={() => handleRemoveRelatedTerm(termIndex)}
                              className="ml-2 hover:opacity-70"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))}

                      {(editingCluster === index ? editForm?.related_terms : cluster.related_terms)?.length === 0 && (
                        <span
                          className="text-sm italic"
                          style={{ color: colors.utility.secondaryText }}
                        >
                          No related terms yet
                        </span>
                      )}
                    </div>

                    {/* Add Term Input (in edit mode) */}
                    {editingCluster === index && (
                      <div className="mt-3 flex space-x-2">
                        <input
                          type="text"
                          value={newTermInput}
                          onChange={(e) => setNewTermInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddRelatedTerm()}
                          placeholder="Add related term..."
                          className="flex-1 px-3 py-2 rounded-lg text-sm"
                          style={{
                            backgroundColor: colors.utility.secondaryBackground,
                            color: colors.utility.primaryText,
                            border: `1px solid ${colors.utility.primaryText}20`
                          }}
                        />
                        <button
                          onClick={handleAddRelatedTerm}
                          disabled={!newTermInput.trim()}
                          className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-80 disabled:opacity-50"
                          style={{
                            backgroundColor: colors.brand.primary,
                            color: '#FFF'
                          }}
                        >
                          Add
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Save Button */}
      {clusters.length > 0 && (
        <div
          className="p-6 flex items-center justify-between"
          style={{
            backgroundColor: colors.utility.primaryBackground,
            borderTop: `1px solid ${colors.utility.primaryText}10`
          }}
        >
          <div className="text-sm" style={{ color: colors.utility.secondaryText }}>
            {hasChanges ? (
              <span className="flex items-center space-x-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: colors.semantic.warning }}
                />
                <span>Unsaved changes</span>
              </span>
            ) : (
              <span>All changes saved</span>
            )}
          </div>

          <button
            onClick={handleSaveAllClusters}
            disabled={isSaving || !hasChanges || editingCluster !== null}
            className="flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              background: hasChanges
                ? `linear-gradient(to right, ${colors.semantic.success}, ${colors.brand.primary})`
                : colors.utility.secondaryBackground,
              color: hasChanges ? '#FFF' : colors.utility.secondaryText,
              border: hasChanges ? 'none' : `1px solid ${colors.utility.primaryText}20`
            }}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save Clusters</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default SemanticClustersForm;
