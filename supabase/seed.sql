-- Humanity Platform: Synthetic Baseline Seed Data (Phase 05)
-- STRICT NOTICE: Synthetic test records only. Zero real personal data or production credentials.

-- 1. Seed Iraqi Governorates
INSERT INTO geo_governorates (id, name_ar, name_en, is_active) VALUES
  ('IQ-BG', 'بغداد', 'Baghdad', true),
  ('IQ-NI', 'نينوى', 'Ninewa', true),
  ('IQ-AR', 'أربيل', 'Erbil', true),
  ('IQ-BA', 'البصرة', 'Basra', true),
  ('IQ-AN', 'الأنبار', 'Anbar', true),
  ('IQ-KI', 'كركوك', 'Kirkuk', true),
  ('IQ-SU', 'السليمانية', 'Sulaymaniyah', true),
  ('IQ-DA', 'دهوك', 'Duhok', true)
ON CONFLICT (id) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en;

-- 2. Seed Districts
INSERT INTO geo_districts (id, governorate_id, name_ar, name_en) VALUES
  ('IQ-BG-KAD', 'IQ-BG', 'الكاظمية', 'Kadhimiya'),
  ('IQ-BG-KAR', 'IQ-BG', 'الكرخ', 'Karkh'),
  ('IQ-BG-RUS', 'IQ-BG', 'الرصافة', 'Rusafa'),
  ('IQ-NI-MOS', 'IQ-NI', 'الموصل', 'Mosul'),
  ('IQ-NI-TEL', 'IQ-NI', 'تلعفر', 'Tel Afar'),
  ('IQ-AR-ERB', 'IQ-AR', 'أربيل المركز', 'Erbil Center'),
  ('IQ-BA-BAS', 'IQ-BA', 'البصرة المركز', 'Basra Center'),
  ('IQ-AN-RAM', 'IQ-AN', 'الرمادي', 'Ramadi'),
  ('IQ-AN-FAL', 'IQ-AN', 'الفلوجة', 'Fallujah')
ON CONFLICT (id) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en;

-- 3. Seed Eight Official Programmes
INSERT INTO programmes (code, name_ar, name_en, description_ar, description_en, is_active) VALUES
  ('FIN', 'المساعدات النقدية والمالية', 'Financial Assistance', 'التحويلات النقدية متعددة الأغراض ودعم سبل العيش في حالات الطوارئ', 'Multi-purpose cash assistance and emergency livelihood transfers', true),
  ('FOD', 'الأمن الغذائي والتغذية', 'Food Security & Nutrition', 'توزيع السلات الغذائية التكميلية ودعم التغذية للأطفال والأمهات', 'Supplementary food baskets and maternal/child nutrition support', true),
  ('MED', 'الرعاية الصحية والخدمات الطبية', 'Medical & Healthcare Support', 'تغطية نفقات العلاج التخصصي، الأدوية المزمنة والأجهزة التعويضية', 'Specialized medical treatment subsidies, chronic medicine, assistive devices', true),
  ('HOU', 'المأوى وإعادة تأهيل المساكن', 'Housing & Shelter Rehabilitation', 'إعادة تأهيل المنازل المتضررة جزئياً ومستلزمات العزل الشتوي', 'Subsidized minor home rehabilitation and winterization insulation', true),
  ('EDU', 'التعليم ورعاية الطفل', 'Education & Child Support', 'دعم القرطاسية المدرسية، الصفوف التعويضية، وتغطية نفقات النقل المدرسي', 'School supplies, non-formal catch-up classes, and transport stipends', true),
  ('EMG', 'الاستجابة الإنسانية الطارئة', 'Emergency Rapid Response', 'مساعدات الإغاثة العاجلة خلال 48 ساعة للمتضررين من الكوارث والنزوح', 'Rapid 48-hour emergency relief for sudden displacement and disaster', true),
  ('EMP', 'التأهيل المهني والتشغيل', 'Employment & Livelihoods', 'برامج التدريب المهني، منح المشاريع الصغيرة، ومطابقة فرص العمل', 'Vocational apprenticeships, micro-grants, and labor market matching', true),
  ('SOC', 'الخدمات الاجتماعية والدعم القانوني', 'Social & Legal Protection Services', 'استخراج الوثائق الثبوتية المفقودة، الإرشاد النفسي، والتمثيل القانوني', 'Civil documentation recovery, psychosocial support, and legal counseling', true)
ON CONFLICT (code) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  description_ar = EXCLUDED.description_ar,
  description_en = EXCLUDED.description_en;

-- 4. Seed Synthetic Staff Profiles (Fictional Test Staff)
INSERT INTO staff_profiles (id, email, full_name_ar, full_name_en, phone_number, is_active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'security.admin@humanity.local', 'علي حسين عبد الله (مسؤول أمن)', 'Ali Hussein (Security Admin)', '+9647700000001', true),
  ('00000000-0000-0000-0000-000000000002', 'supervisor.baghdad@humanity.local', 'سارة كريم كاظم (مشرفة بغداد)', 'Sara Karim (Supervisor Baghdad)', '+9647700000002', true),
  ('00000000-0000-0000-0000-000000000003', 'caseworker.ninewa@humanity.local', 'يوسف محمود عمر (باحث نينوى)', 'Yousif Mahmoud (Caseworker Ninewa)', '+9647700000003', true),
  ('00000000-0000-0000-0000-000000000004', 'finance.maker@humanity.local', 'زينب أحمد حسن (منظمة المعاملات)', 'Zainab Ahmed (Finance Maker)', '+9647700000004', true),
  ('00000000-0000-0000-0000-000000000005', 'finance.checker@humanity.local', 'حيدر مهدي جاسم (المدقق المالي)', 'Haidar Mahdi (Finance Checker)', '+9647700000005', true),
  ('00000000-0000-0000-0000-000000000006', 'auditor@humanity.local', 'نور هادي فؤاد (مدقق الالتزام)', 'Noor Hadi (Compliance Auditor)', '+9647700000006', true)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name_ar = EXCLUDED.full_name_ar,
  full_name_en = EXCLUDED.full_name_en;

-- 5. Seed Staff Roles
INSERT INTO staff_roles (staff_id, role, is_active, assigned_by) VALUES
  ('00000000-0000-0000-0000-000000000001', 'security_admin', true, '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002', 'supervisor', true, '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000003', 'caseworker', true, '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000004', 'finance_maker', true, '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000005', 'finance_checker', true, '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000006', 'auditor', true, '00000000-0000-0000-0000-000000000001')
ON CONFLICT (staff_id, role) DO UPDATE SET is_active = EXCLUDED.is_active;

-- 6. Seed Baseline Assessment Template for MPCA (FIN)
INSERT INTO assessment_templates (
  id, programme_code, version, title_ar, title_en, schema_definition, is_published
) VALUES (
  '10000000-0000-0000-0000-000000000001',
  'FIN',
  1,
  'استمارة تقييم الضعف الاقتصادي للمساعدات النقدية (MPCA)',
  'Economic Vulnerability Assessment for Multi-Purpose Cash Assistance',
  '{
    "sections": [
      {
        "id": "income_debt",
        "title_ar": "الدخل والديون",
        "title_en": "Income & Debt",
        "fields": [
          {"id": "monthly_income_iqd", "type": "number", "label_ar": "الدخل الشهري التقريبي (د.ع)", "required": true},
          {"id": "accumulated_debt_iqd", "type": "number", "label_ar": "إجمالي الديون المتراكمة (د.ع)", "required": true}
        ]
      },
      {
        "id": "household_vulnerability",
        "title_ar": "مؤشرات الضعف الأسري",
        "title_en": "Household Vulnerability",
        "fields": [
          {"id": "dependency_ratio", "type": "number", "label_ar": "نسبة الإعالة (أطفال وكبار سن)", "required": true},
          {"id": "has_chronic_illness", "type": "boolean", "label_ar": "وجود أفراد مصابين بأمراض مزمنة", "required": true}
        ]
      }
    ]
  }'::jsonb,
  true
)
ON CONFLICT (programme_code, version) DO UPDATE SET
  title_ar = EXCLUDED.title_ar,
  schema_definition = EXCLUDED.schema_definition;

-- 7. Seed Synthetic Beneficiaries & Households
INSERT INTO beneficiaries (
  id, national_id_type, national_id_number, full_name_ar, full_name_en, mother_name_ar,
  date_of_birth, gender, phone_primary, governorate_id, district_id, address_details,
  displacement_status, vulnerability_flags, is_safeguarded, created_by
) VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    'national_card',
    '198501234567',
    'طارق إبراهيم خليل الجبوري',
    'Tariq Ibrahim Khalil Al-Jubouri',
    'مريم صالح',
    '1985-04-12',
    'male',
    '+9647711223344',
    'IQ-NI',
    'IQ-NI-MOS',
    'حي النور، الموصل القديمة، قرب جامع النور',
    'returnee',
    ARRAY['chronic_illness', 'damaged_shelter'],
    false,
    '00000000-0000-0000-0000-000000000003'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'civil_status_id',
    '199209876543',
    'هدى عبد الكريم شاكر العبيدي',
    'Huda Abdulkarim Shakir Al-Obeidi',
    'فاطمة كاظم',
    '1992-08-25',
    'female',
    '+9647722334455',
    'IQ-BG',
    'IQ-BG-KAR',
    'الكرخ، شارع حيفا، مجمع سكني 4',
    'host_community',
    ARRAY['female_headed_household', 'minor_children'],
    false,
    '00000000-0000-0000-0000-000000000002'
  )
ON CONFLICT (id) DO NOTHING;

-- 8. Seed Synthetic Household Units
INSERT INTO households (id, head_beneficiary_id, governorate_id, district_id, shelter_type) VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'IQ-NI', 'IQ-NI-MOS', 'damaged_structure'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'IQ-BG', 'IQ-BG-KAR', 'rented_house')
ON CONFLICT (id) DO NOTHING;

INSERT INTO household_members (id, household_id, beneficiary_id, relationship_to_head) VALUES
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'head'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'head')
ON CONFLICT (id) DO NOTHING;

-- 9. Seed Synthetic Demonstration Cases
INSERT INTO cases (
  id, case_reference, beneficiary_id, household_id, programme_code,
  status, priority, assigned_caseworker_id, governorate_id, created_by
) VALUES
  (
    '50000000-0000-0000-0000-000000000001',
    'HUM-2026-FIN-00001',
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'FIN',
    'under_assessment',
    'high',
    '00000000-0000-0000-0000-000000000003',
    'IQ-NI',
    '00000000-0000-0000-0000-000000000003'
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    'HUM-2026-FOD-00002',
    '20000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000002',
    'FOD',
    'approved',
    'medium',
    '00000000-0000-0000-0000-000000000002',
    'IQ-BG',
    '00000000-0000-0000-0000-000000000002'
  )
ON CONFLICT (case_reference) DO NOTHING;
