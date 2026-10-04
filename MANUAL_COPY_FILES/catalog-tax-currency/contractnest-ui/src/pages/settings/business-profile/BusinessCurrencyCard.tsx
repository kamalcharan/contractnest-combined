// src/pages/settings/business-profile/BusinessCurrencyCard.tsx
//
// Business currency (t_tenant_profiles.default_currency, migration
// catalog-studio/008). The catalog VaNi seeds is priced in this currency only;
// other currencies on a block are added in Catalog Studio.
// Read/save: GET /api/catalog-defaults, PUT /api/catalog-defaults/currency.

import React, { useEffect, useState } from 'react';
import { Coins, Loader2 } from 'lucide-react';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { vaniToast } from '@/components/common/toast/VaNiToast';
import { currencyOptions } from '@/utils/constants/currencies';

interface Props {
  colors: any;
}

const BusinessCurrencyCard: React.FC<Props> = ({ colors }) => {
  const [currency, setCurrency] = useState('');
  const [saved, setSaved] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get(API_ENDPOINTS.CATALOG_DEFAULTS.GET)
      .then((r) => {
        if (!alive) return;
        const c = r.data?.data?.currency || '';
        setCurrency(c);
        setSaved(c);
      })
      .catch(() => alive && vaniToast.error('Could not load your business currency'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const handleSave = async () => {
    if (saving || currency === saved) return;
    setSaving(true);
    try {
      await api.put(API_ENDPOINTS.CATALOG_DEFAULTS.CURRENCY, { currency });
      setSaved(currency);
      vaniToast.success('Business currency saved', {
        message: `New catalog items will be priced in ${currency}. Existing prices are not converted.`,
      });
    } catch (err: any) {
      vaniToast.error('Could not save the currency', {
        message: err?.response?.data?.error?.message || err?.message || 'Please try again',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="rounded-lg border shadow-sm p-6 transition-colors"
      style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '20' }}
    >
      <div className="flex items-center space-x-3 mb-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: colors.brand.primary + '20', color: colors.brand.primary }}
        >
          <Coins size={20} />
        </div>
        <h3 className="font-semibold text-lg transition-colors" style={{ color: colors.utility.primaryText }}>
          Business Currency
        </h3>
      </div>
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: colors.brand.primary }} />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={saving}
            className="rounded-md border px-3 py-2 text-sm"
            style={{ backgroundColor: colors.utility.primaryBackground, color: colors.utility.primaryText, borderColor: colors.utility.primaryText + '30' }}
          >
            {currencyOptions.map((c) => (
              <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
            ))}
          </select>
          {currency !== saved && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md px-4 py-2 text-sm font-medium text-white flex items-center gap-2"
              style={{ backgroundColor: colors.brand.primary }}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          )}
          <p className="w-full text-sm" style={{ color: colors.utility.secondaryText }}>
            Your catalog is priced in this currency. Other currencies can be added per item in Catalog Studio.
          </p>
        </div>
      )}
    </div>
  );
};

export default BusinessCurrencyCard;
