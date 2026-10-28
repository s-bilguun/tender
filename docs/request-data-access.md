# Official data-access request (send this yourself)

**Why:** tender.gov.mn now blocks all automated access with a human check, and the old
open-data API (`opendata.tender.gov.mn`) no longer resolves. An official token or written
permission is the only reliable way to show tender documents (budgets, deadlines,
requirements) on TenderHub. This is also the only route we will take for that data.

**Where to send it (pick any; a person must do this):**
- Contact form / email on tender.gov.mn (open the site in your own browser, "Холбоо барих").
- Төрийн худалдан авах ажиллагааны газар (Government Procurement Agency), Facebook page `spagovmn`.
- Government hotline 11-11 (ask to be routed to the e-procurement / IT department).

**Message (Mongolian):**

> Төрийн худалдан авах ажиллагааны газрын Цахим худалдан авах ажиллагаа, мэдээллийн технологийн хэлтэст
>
> Сайн байна уу. Бид tender.gov.mn-д нийтлэгдсэн тендерийн урилгыг гадаад болон дотоодын нийлүүлэгчдэд монгол, англи, хятад хэлээр хүргэх TenderHub (https://tender-mu-five.vercel.app) үйлчилгээг хөгжүүлж байна.
>
> Өмнө ажиллаж байсан opendata.tender.gov.mn API одоогоор нээгдэхгүй байгаа тул дараах хоёрын аль нэгийг хүсэж байна:
> 1. Нээлттэй өгөгдлийн API-д (тендерийн урилга, хавсралт баримт бичиг) хандах токен олгох, эсвэл
> 2. Манай серверээс тендерийн жагсаалт, ТШБ хавсралтыг автоматаар татахыг зөвшөөрөх (хүсэлтийн давтамжийг өдөрт хэдэн зуу хүртэл хязгаарлана).
>
> Токен нь зарлагдсан бүх тендерийг хамрах эсэх, ашиглалтын нөхцөл, төлбөртэй эсэхийг тодруулж өгнө үү.
>
> Хүндэтгэсэн,
> [Нэр, байгууллага, утас, имэйл]

**When you get a token:** add it in Vercel as `TENDER_OPENDATA_TOKEN` and ask Claude to wire
`lib/opendata-client.ts` and switch the cron to it.
