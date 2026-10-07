/**
 * Arabic for the messages the server writes in English. The server has one language;
 * the interface has two, so the translation happens here, on the way in, and every
 * screen shows the result without knowing it was translated.
 *
 * Each entry matches a whole message. A message with a number in it is matched by
 * pattern, and the captured values are put back into the Arabic text as $1, $2.
 * A message with no entry is shown as the server sent it.
 */
const ARABIC: [RegExp, string][] = [
  // Envelope and general failures.
  [/^One or more validation errors occurred\.$/, 'بعض البيانات غير صحيحة. راجع الحقول المحددة.'],
  [/^Authentication is required\.$/, 'يجب تسجيل الدخول أولًا.'],
  [/^You are not allowed to perform this action\.$/, 'ليست لديك صلاحية لتنفيذ هذا الإجراء.'],
  [/^The requested resource was not found\.$/, 'العنصر المطلوب غير موجود.'],
  [/^.+ '.*' was not found\.$/, 'العنصر المطلوب غير موجود.'],
  [/^The request could not be completed\.$/, 'تعذّر إتمام الطلب.'],
  [/^An unexpected error occurred\.$/, 'حدث خطأ غير متوقع.'],
  [/^This item was changed by someone else\. Please reload and try again\.$/, 'عدّل شخص آخر هذا العنصر. أعد تحميل الصفحة وحاول مرة أخرى.'],
  [/^This item was changed by someone else\.$/, 'عدّل شخص آخر هذا العنصر.'],
  [/^The request was cancelled\.$/, 'أُلغي الطلب.'],
  [/^The request content type is not supported\.$/, 'نوع محتوى الطلب غير مدعوم.'],
  [/^The length of '.+' must be (\d+) characters or fewer\. You entered \d+ characters\.$/, 'النص طويل جدًا: الحد الأقصى $1 حرفًا.'],

  // The book form.
  [/^A title is required\.$/, 'أدخل عنوان الكتاب.'],
  [/^The title is too short\.$/, 'عنوان الكتاب قصير جدًا.'],
  [/^The title is too long\.$/, 'عنوان الكتاب طويل جدًا.'],
  [/^Choose a category\.$/, 'اختر القسم المناسب.'],
  [/^This category is not accepting new listings\.$/, 'هذا القسم لا يقبل كتبًا جديدة حاليًا.'],
  [/^(The price|Price) must be greater than zero\.$/, 'أدخل سعرًا أكبر من صفر.'],
  [/^That price looks wrong\. Check it and try again\.$/, 'السعر يبدو غير صحيح. راجعه وحاول مرة أخرى.'],
  [/^Choose a language\.$/, 'اختر لغة الكتاب.'],
  [/^Enter the number of pages\.$/, 'أدخل عدد الصفحات.'],
  [/^A page count must be between (\d+) and (\d+)\.$/, 'عدد الصفحات يجب أن يكون بين $1 و$2.'],
  [/^A publication year must be between (\d+) and (\d+)\.$/, 'سنة النشر يجب أن تكون بين $1 و$2.'],
  [/^An ISBN has 10 or 13 digits\.$/, 'الترقيم الدولي ISBN يتكون من 10 أو 13 رقمًا.'],
  [/^The description is too long\.$/, 'الوصف طويل جدًا.'],
  [/^Describe the condition of the copy\.$/, 'صف حالة النسخة.'],
  [/^Choose an overall condition\.$/, 'اختر الحالة العامة.'],
  [/^Choose a cover condition\.$/, 'اختر حالة الغلاف.'],
  [/^Choose a pages condition\.$/, 'اختر حالة الصفحات.'],
  [/^A (copy|book) with missing pages cannot be graded as new or like new\.$/, 'لا يمكن وصف نسخة بها صفحات ناقصة بأنها جديدة أو كالجديدة.'],
  [/^Remove phone numbers, email addresses, links and messenger names\. All contact goes through the platform\.$/, 'احذف أرقام الهواتف والبريد الإلكتروني والروابط وأسماء تطبيقات المراسلة، فكل التواصل يتم عبر المنصة.'],
  [/^The book details are missing\.$/, 'بيانات الكتاب غير موجودة.'],
  [/^The book details could not be read\.$/, 'تعذّرت قراءة بيانات الكتاب.'],

  // The seller and the listing.
  [/^This account does not have a seller profile yet\.$/, 'هذا الحساب ليس له ملف بائع بعد.'],
  [/^This seller account is suspended and cannot list books\.$/, 'حساب البائع موقوف ولا يمكنه عرض كتب.'],
  [/^A book in status .+ can no longer be edited by its seller\.$/, 'لا يمكن تعديل هذا الكتاب في حالته الحالية.'],
  [/^A listing the platform has already seen cannot be deleted\. Withdraw it instead\.$/, 'لا يمكن حذف كتاب راجعته المنصة. اسحبه بدلًا من ذلك.'],

  // Photographs.
  [/^Add a cover photograph\.$/, 'أضف صورة الغلاف.'],
  [/^A cover image is required before a book can be submitted for review\.$/, 'صورة الغلاف مطلوبة قبل إرسال الكتاب للمراجعة.'],
  [/^A book can have at most (\d+) photographs\.$/, 'يمكن إضافة $1 صور على الأكثر.'],
  [/^Images must be smaller than (\d+) MB\.$/, 'حجم الصورة يجب أن يكون أقل من $1 ميجابايت.'],
  [/^Only JPEG, PNG and WebP images can be uploaded\.$/, 'يمكن رفع صور JPEG أو PNG أو WebP فقط.'],
  [/^The file type does not match an image\.$/, 'نوع الملف لا يطابق صورة.'],
  [/^This file is not an image we can read\.$/, 'تعذّر قراءة هذا الملف كصورة.'],
  [/^This image could not be (processed|resized)\.$/, 'تعذّرت معالجة هذه الصورة.'],
  [/^The uploaded file is empty\.$/, 'الملف المرفوع فارغ.'],
  [/^Choose an image to upload\.$/, 'اختر صورة لرفعها.'],
  [/^Choose what the photograph shows\.$/, 'حدد ما تعرضه الصورة.'],
  [/^Image not found on this book\.$/, 'الصورة غير موجودة في هذا الكتاب.'],
];

/** The message in the given language: Arabic when there is a translation, otherwise as sent. */
export function translateServerMessage(message: string, language: string): string {
  if (language !== 'ar') {
    return message;
  }

  for (const [pattern, arabic] of ARABIC) {
    if (pattern.test(message)) {
      return message.replace(pattern, arabic);
    }
  }

  return message;
}
