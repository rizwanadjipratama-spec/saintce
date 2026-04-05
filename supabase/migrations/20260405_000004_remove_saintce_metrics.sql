begin;

delete from public.site_content_sections
where section_key = 'metrics';

commit;
