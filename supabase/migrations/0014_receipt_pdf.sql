-- Račun je lahko tudi PDF (ReceiptButtons → Datoteka). Bucket cekar-racuni
-- dovoli application/pdf poleg slik.
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
where id = 'cekar-racuni';
