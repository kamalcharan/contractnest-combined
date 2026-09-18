-- msg91-email-templates : run AFTER the templates are approved at MSG91.
-- Replace the two literals below with the approved MSG91 template ids.
\set visit_slot_id    'visit_slot_request_email'
\set contract_acc_id  'contract_accepted_email'

BEGIN;

UPDATE n_jtd_templates
   SET provider_template_id = :'visit_slot_id',
       content_html         = $html$<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f4f5;margin:0;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <tr>
    <td align="center">

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">

        <tr>
          <td style="height:5px;line-height:5px;font-size:0;background-color:#2563eb;">&nbsp;</td>
        </tr>

        <tr>
          <td style="padding:28px 32px 0 32px;">
            <p style="margin:0;font-size:19px;line-height:26px;font-weight:700;color:#18181b;">{{tenant_name}}</p>
            <p style="margin:6px 0 0 0;font-size:12px;line-height:18px;letter-spacing:1.2px;text-transform:uppercase;color:#71717a;font-weight:700;">Service visit &mdash; please confirm</p>
          </td>
        </tr>

        <tr>
          <td style="padding:22px 32px 0 32px;">
            <p style="margin:0;font-size:15px;line-height:23px;color:#3f3f46;">
              Hi {{customer_name}},
            </p>
            <p style="margin:10px 0 0 0;font-size:15px;line-height:23px;color:#3f3f46;">
              We would like to visit for {{service_name}}. Please confirm the time below, or suggest one that suits you better.
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 32px 0 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0;font-size:11px;line-height:16px;letter-spacing:1.1px;text-transform:uppercase;color:#1d4ed8;font-weight:700;">Proposed time</p>
                  <p style="margin:6px 0 0 0;font-size:26px;line-height:34px;font-weight:700;color:#18181b;">{{slot_text}}</p>
                  <p style="margin:8px 0 0 0;font-size:13px;line-height:19px;color:#3f3f46;">
                    for <span style="color:#18181b;font-weight:600;">{{service_name}}</span>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:24px 32px 0 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" bgcolor="#2563eb" style="border-radius:8px;">
                  <a href="{{link}}" style="display:inline-block;padding:14px 32px;font-size:15px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">Confirm or change this time</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:18px 32px 0 32px;">
            <p style="margin:0;font-size:13px;line-height:20px;color:#71717a;">
              If this time does not suit you, use the same link to suggest another &mdash; we will confirm the new time with you before the visit.
            </p>
            <p style="margin:10px 0 0 0;font-size:12px;line-height:18px;color:#a1a1aa;">If the button does not work, copy this link:</p>
            <p style="margin:2px 0 0 0;font-size:12px;line-height:18px;color:#2563eb;word-break:break-all;">{{link}}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:22px 32px 0 32px;">
            <div style="height:1px;line-height:1px;font-size:0;background-color:#e4e4e7;">&nbsp;</div>
          </td>
        </tr>

        <tr>
          <td style="padding:18px 32px 30px 32px;">
            <p style="margin:0;font-size:13px;line-height:20px;color:#3f3f46;">
              Thank you,<br />
              <span style="font-weight:600;color:#18181b;">{{tenant_name}}</span>
            </p>
          </td>
        </tr>

      </table>

      <p style="margin:16px 0 0 0;font-size:11px;line-height:17px;color:#a1a1aa;">
        Sent by {{tenant_name}} via ContractNest
      </p>

    </td>
  </tr>
</table>
$html$,
       updated_at           = now()
 WHERE tenant_id IS NULL AND template_key = 'visit_slot_request_email';

UPDATE n_jtd_templates
   SET provider_template_id = :'contract_acc_id',
       content_html         = $html$<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f4f5;margin:0;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <tr>
    <td align="center">

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">

        <tr>
          <td style="height:5px;line-height:5px;font-size:0;background-color:#16a34a;">&nbsp;</td>
        </tr>

        <tr>
          <td style="padding:28px 32px 0 32px;">
            <p style="margin:0;font-size:19px;line-height:26px;font-weight:700;color:#18181b;">{{seller_name}}</p>
            <p style="margin:6px 0 0 0;font-size:12px;line-height:18px;letter-spacing:1.2px;text-transform:uppercase;color:#71717a;font-weight:700;">Contract accepted</p>
          </td>
        </tr>

        <tr>
          <td style="padding:22px 32px 0 32px;">
            <p style="margin:0;font-size:15px;line-height:23px;color:#3f3f46;">
              Good news &mdash; <span style="color:#18181b;font-weight:600;">{{buyer_name}}</span> has accepted your contract.
            </p>
            <p style="margin:10px 0 0 0;font-size:15px;line-height:23px;color:#3f3f46;">
              The agreement is now active, and its service and billing schedules are live in ContractNest.
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 32px 0 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0;font-size:11px;line-height:16px;letter-spacing:1.1px;text-transform:uppercase;color:#15803d;font-weight:700;">Contract value</p>
                  <p style="margin:6px 0 0 0;font-size:32px;line-height:40px;font-weight:700;color:#18181b;">{{contract_value}}</p>
                  <p style="margin:8px 0 0 0;font-size:13px;line-height:19px;color:#3f3f46;">
                    Accepted on <span style="color:#18181b;font-weight:600;">{{accepted_on}}</span>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 32px 0 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e4e4e7;border-radius:10px;overflow:hidden;">
              <tr>
                <td style="padding:14px 24px;background-color:#fafafa;border-bottom:1px solid #e4e4e7;">
                  <p style="margin:0;font-size:15px;line-height:22px;font-weight:600;color:#18181b;">{{contract_title}}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 24px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td style="padding:0 0 8px 0;font-size:13px;line-height:20px;color:#71717a;">Contract number</td>
                      <td align="right" style="padding:0 0 8px 0;font-size:13px;line-height:20px;color:#18181b;font-weight:600;">{{contract_number}}</td>
                    </tr>
                    <tr>
                      <td style="font-size:13px;line-height:20px;color:#71717a;">Accepted by</td>
                      <td align="right" style="font-size:13px;line-height:20px;color:#18181b;font-weight:600;">{{buyer_name}}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:24px 32px 0 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" bgcolor="#16a34a" style="border-radius:8px;">
                  <a href="{{contract_link}}" style="display:inline-block;padding:14px 32px;font-size:15px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">Open the contract</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:18px 32px 0 32px;">
            <p style="margin:0;font-size:13px;line-height:20px;color:#71717a;">
              No action is needed from you right now. You can track this contract&rsquo;s visits and payments from your Ops Cockpit.
            </p>
            <p style="margin:10px 0 0 0;font-size:12px;line-height:18px;color:#a1a1aa;">If the button does not work, copy this link:</p>
            <p style="margin:2px 0 0 0;font-size:12px;line-height:18px;color:#16a34a;word-break:break-all;">{{contract_link}}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:22px 32px 0 32px;">
            <div style="height:1px;line-height:1px;font-size:0;background-color:#e4e4e7;">&nbsp;</div>
          </td>
        </tr>

        <tr>
          <td style="padding:18px 32px 30px 32px;">
            <p style="margin:0;font-size:13px;line-height:20px;color:#3f3f46;">
              ContractNest
            </p>
          </td>
        </tr>

      </table>

      <p style="margin:16px 0 0 0;font-size:11px;line-height:17px;color:#a1a1aa;">
        Sent to {{seller_name}} by ContractNest
      </p>

    </td>
  </tr>
</table>
$html$,
       updated_at           = now()
 WHERE tenant_id IS NULL AND template_key = 'contract_accepted_email';

-- post-check: both must be wired, or nothing commits
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM n_jtd_templates
   WHERE tenant_id IS NULL
     AND template_key IN ('visit_slot_request_email','contract_accepted_email')
     AND provider_template_id IS NOT NULL AND content_html IS NOT NULL;
  IF n <> 2 THEN
    RAISE EXCEPTION 'expected 2 wired email templates, found %', n;
  END IF;
END $$;

COMMIT;
