import 'package:flutter/material.dart';
import '../../core/localization/app_translations.dart';
import '../../core/localization/locale_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../models/beneficiary.dart';
import '../../services/casework_service.dart';
import 'beneficiary_register_screen.dart';

class BeneficiarySearchScreen extends StatefulWidget {
  final CaseworkService caseworkService;
  final LocaleState localeState;

  const BeneficiarySearchScreen({
    super.key,
    required this.caseworkService,
    required this.localeState,
  });

  @override
  State<BeneficiarySearchScreen> createState() => _BeneficiarySearchScreenState();
}

class _BeneficiarySearchScreenState extends State<BeneficiarySearchScreen> {
  final _searchController = TextEditingController();
  List<Beneficiary> _results = [];

  @override
  void initState() {
    super.initState();
    _results = widget.caseworkService.searchBeneficiaries('');
  }

  void _onSearch(String query) {
    setState(() {
      _results = widget.caseworkService.searchBeneficiaries(query);
    });
  }

  @override
  Widget build(BuildContext context) {
    final lang = widget.localeState.language;

    return Scaffold(
      appBar: AppBar(
        title: Text(AppTranslations.get('nav_beneficiaries', lang)),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            children: [
              TextField(
                controller: _searchController,
                onChanged: _onSearch,
                decoration: InputDecoration(
                  hintText: AppTranslations.get('search_beneficiary_hint', lang),
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () {
                            _searchController.clear();
                            _onSearch('');
                          },
                        )
                      : null,
                ),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: _results.isEmpty
                    ? Center(
                        child: Text(
                          widget.localeState.isArabic
                              ? 'لم يتم العثور على نتائج مطابقة'
                              : 'No matching beneficiaries found',
                          style: const TextStyle(color: AppTheme.textMuted),
                        ),
                      )
                    : ListView.builder(
                        itemCount: _results.length,
                        itemBuilder: (context, index) {
                          final b = _results[index];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: ListTile(
                              leading: const CircleAvatar(
                                backgroundColor: AppTheme.lightGreen,
                                child: Icon(Icons.person, color: AppTheme.primaryGreen),
                              ),
                              title: Text(
                                widget.localeState.isArabic ? b.fullNameAr : b.fullNameEn,
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              subtitle: Text(
                                '${b.nationalId} • ${b.phone} • ${b.governorateId}',
                                style: const TextStyle(fontSize: 12),
                              ),
                              trailing: Chip(
                                label: Text(
                                  b.hasInformedConsent
                                      ? (widget.localeState.isArabic ? 'موافقة موثقة' : 'Consented')
                                      : (widget.localeState.isArabic ? 'غير موثق' : 'No Consent'),
                                  style: const TextStyle(fontSize: 10, color: AppTheme.primaryGreen),
                                ),
                                backgroundColor: AppTheme.lightGreen,
                                side: BorderSide.none,
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppTheme.primaryGreen,
        foregroundColor: Colors.white,
        onPressed: () async {
          final registered = await Navigator.push<bool>(
            context,
            MaterialPageRoute(
              builder: (context) => BeneficiaryRegisterScreen(
                caseworkService: widget.caseworkService,
                localeState: widget.localeState,
              ),
            ),
          );
          if (registered == true) {
            _onSearch(_searchController.text);
          }
        },
        icon: const Icon(Icons.person_add),
        label: Text(AppTranslations.get('register_beneficiary_title', lang)),
      ),
    );
  }
}
