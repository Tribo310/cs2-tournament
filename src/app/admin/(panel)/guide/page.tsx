import {
  BookOpenIcon,
  CalendarClockIcon,
  CalendarDaysIcon,
  CircleHelpIcon,
  GaugeIcon,
  KeyRoundIcon,
  LayersIcon,
  ListChecksIcon,
  RadioIcon,
  SettingsIcon,
  ShieldIcon,
  SigmaIcon,
  TrophyIcon,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/admin/page-header";

export const metadata: Metadata = { title: "Гарын авлага" };

// Static how-to for admins. UI names in «» must match the real labels on each page.

const TOPICS: { id: string; title: string; icon: LucideIcon; href?: string }[] = [
  { id: "start", title: "Эхлэх дараалал", icon: ListChecksIcon },
  { id: "login", title: "Нэвтрэх, админ", icon: KeyRoundIcon },
  { id: "dashboard", title: "Хянах самбар", icon: GaugeIcon, href: "/admin" },
  { id: "settings", title: "Тохиргоо", icon: SettingsIcon, href: "/admin/settings" },
  { id: "teams", title: "Багууд", icon: ShieldIcon, href: "/admin/teams" },
  { id: "groups", title: "Группүүд", icon: LayersIcon, href: "/admin/groups" },
  { id: "matches", title: "Тоглолтууд", icon: CalendarClockIcon, href: "/admin/matches" },
  { id: "live", title: "Тоглолт шууд удирдах", icon: RadioIcon },
  { id: "schedule", title: "Хуваарь", icon: CalendarDaysIcon, href: "/admin/schedule" },
  { id: "playoff", title: "Плей-офф", icon: TrophyIcon, href: "/admin/bracket" },
  { id: "rules", title: "Оноо, байрны дүрэм", icon: SigmaIcon },
  { id: "faq", title: "Асуудал гарвал", icon: CircleHelpIcon },
];

/** A UI label exactly as it appears on screen. */
function Ui({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-sm border border-border bg-muted px-1.5 py-px text-[0.8125rem] font-medium whitespace-nowrap text-foreground">
      {children}
    </span>
  );
}

function Tip({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) {
  return (
    <p
      className={
        tone === "warn"
          ? "rounded-md border border-side-t/40 bg-side-t/10 px-3 py-2 text-sm"
          : "rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm"
      }
    >
      <b className={tone === "warn" ? "text-side-t" : "text-primary"}>{tone === "warn" ? "Анхаар: " : "Зөвлөгөө: "}</b>
      {children}
    </p>
  );
}

function Steps({ children }: { children: ReactNode }) {
  return <ol className="list-decimal space-y-1.5 pl-5 marker:font-heading marker:font-bold marker:text-primary">{children}</ol>;
}

function Bullets({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5 marker:text-muted-foreground">{children}</ul>;
}

function H3({ children }: { children: ReactNode }) {
  return <h3 className="pt-2 font-heading text-base font-bold">{children}</h3>;
}

function Topic({ id, children }: { id: string; children: ReactNode }) {
  const t = TOPICS.find((x) => x.id === id)!;
  const Icon = t.icon;
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 space-y-3 rounded-md border bg-card p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-9 place-items-center rounded-md bg-primary/15 text-primary">
          <Icon className="size-5" aria-hidden />
        </span>
        <h2 id={`${id}-title`} className="font-heading text-xl font-extrabold">
          {t.title}
        </h2>
        {t.href && (
          <Link href={t.href} className="ml-auto text-sm text-primary underline-offset-4 hover:underline">
            Хуудас руу очих →
          </Link>
        )}
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

export default function GuidePage() {
  return (
    <>
      <PageHeader
        title="Гарын авлага"
        description="Админ хэсэгт юуг хаанаас, яаж хийхийг алхам алхмаар тайлбарлав. Дэлгэц дээрх товч, талбарын нэрийг ингэж тэмдэглэсэн: «Хадгалах»."
      />

      <nav aria-label="Гарын авлагын агуулга" className="mb-6 rounded-md border bg-card p-4">
        <p className="mb-3 flex items-center gap-2 font-heading text-sm font-bold tracking-widest text-muted-foreground uppercase">
          <BookOpenIcon className="size-4" aria-hidden /> Агуулга
        </p>
        <ol className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((t, i) => (
            <li key={t.id}>
              <a
                href={`#${t.id}`}
                className="flex h-10 items-center gap-2 rounded-md px-2 text-sm transition-colors hover:bg-muted"
              >
                <span className="tabular w-5 text-right font-heading text-xs font-bold text-muted-foreground">{i + 1}.</span>
                <t.icon className="size-4 text-primary" aria-hidden />
                {t.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-4">
        <Topic id="start">
          <p>Шинэ тэмцээнийг дараах дарааллаар бэлтгэнэ. Хянах самбарын «Эхлэх алхмууд» жагсаалт мөн яг энэ дарааллыг харуулна.</p>
          <Steps>
            <li>
              <a href="#settings" className="text-primary hover:underline">Тохиргоо</a>: тэмцээний нэр, огноо, оноо, плей-оффын төрлийг тохируулна.
            </li>
            <li>
              <a href="#teams" className="text-primary hover:underline">Багууд</a>: баг бүрийг лого, тоглогчидтой нь бүртгэнэ.
            </li>
            <li>
              <a href="#groups" className="text-primary hover:underline">Группүүд</a>: групп үүсгэж, багуудыг хуваарилна.
            </li>
            <li>Группийн тоглолтуудыг нэг нэгээр нь нэмж, цагийг нь товлоно.</li>
            <li>
              Тэмцээний өдөр <a href="#live" className="text-primary hover:underline">тоглолтыг шууд удирдаж</a> оноог оруулна.
            </li>
            <li>
              Группийн шат дуусахад <a href="#playoff" className="text-primary hover:underline">плей-оффыг</a> үүсгэнэ.
            </li>
          </Steps>
          <Tip>
            Хийсэн өөрчлөлт бүр нийтийн сайтад шууд харагдана. Сайтыг шалгах бол зүүн доод буланд байгаа «Сайт үзэх» дээр дарна.
          </Tip>
        </Topic>

        <Topic id="login">
          <Bullets>
            <li>
              Админ хэсэг <b>/admin</b> хаягаар нээгдэнэ. Нэвтрэх нэр, нууц үгээ оруулж «Нэвтрэх» дарна.
            </li>
            <li>Гарахдаа зүүн доод буланд (утсан дээр дээд баруун буланд) «Гарах» дарна.</li>
            <li>
              Шинэ админ нэмэх, нууц үг солих нь сайтын дотроос биш, серверийн тушаалаар хийгдэнэ:{" "}
              <code className="rounded-sm bg-muted px-1">pnpm admin:create нэр</code>. Энэ ажлыг хөгжүүлэгчээсээ хүснэ үү.
            </li>
          </Bullets>
          <Tip tone="warn">Нууц үгээ хэнтэй ч хуваалцахгүй, нийтийн компьютер дээр ажилласны дараа заавал «Гарах» дарна.</Tip>
        </Topic>

        <Topic id="dashboard">
          <Bullets>
            <li>Дээд хэсэгт баг, групп, тоглолтын тоо (дууссан / нийт) харагдана.</li>
            <li>«Эхлэх алхмууд» нь бэлтгэлийн аль алхам дутуу байгааг заана. Бүх алхам хийгдэхэд энэ хэсэг алга болно.</li>
            <li>«Шууд явагдаж буй» болон «Дараагийн тоглолтууд» жагсаалтаас тоглолт дээр дарж шууд удирдах хуудас руу орно.</li>
          </Bullets>
        </Topic>

        <Topic id="settings">
          <H3>Ерөнхий</H3>
          <Bullets>
            <li>
              <Ui>Тэмцээний нэр</Ui>, <Ui>Тайлбар</Ui>: нийтийн сайтын толгой болон нүүр хуудсанд гарна.
            </li>
            <li>
              <Ui>Эхлэх огноо</Ui>, <Ui>Дуусах огноо</Ui>: дуусах огноо эхлэх огнооноос өмнө байж болохгүй.
            </li>
          </Bullets>
          <H3>Группийн шат</H3>
          <Bullets>
            <li>
              <Ui>Тоглолтын формат</Ui>: шинээр нэмэх тоглолтод анхдагчаар сонгогдох формат (BO1 / BO3 / BO5).
            </li>
            <li>
              <Ui>Ялалтын оноо</Ui>, <Ui>Ялагдлын оноо</Ui>: хүснэгтэд тоглолт бүрээс авах оноо. Одоогийн дүрэм: ялалт 1, ялагдал 0.
            </li>
            <li>
              <Ui>Группээс шалгарах</Ui>: групп бүрээс плей-офф руу гарах багийн тоо. Хүснэгтэд эдгээр байр тодруулагдана.
            </li>
          </Bullets>
          <H3>Плей-офф</H3>
          <Bullets>
            <li>
              <Ui>Шатны төрөл</Ui>, <Ui>Багийн тоо</Ui>: плей-офф ямар бүтэцтэй байхыг сонгоно. Дэлгэрэнгүйг{" "}
              <a href="#playoff" className="text-primary hover:underline">Плей-офф</a> хэсгээс уншина уу.
            </li>
          </Bullets>
          <p>Өөрчилсний дараа доод талын «Хадгалах» товчийг дарна.</p>
        </Topic>

        <Topic id="teams">
          <H3>Баг нэмэх</H3>
          <Steps>
            <li>«Багууд» → «Шинэ баг» дарна.</li>
            <li>
              <Ui>Багийн нэр</Ui> болон <Ui>Товчлол</Ui> (жишээ нь NAVI) оруулна. Хоёулаа давхардахгүй байх ёстой.
            </li>
            <li>
              Хүсвэл <Ui>Улс</Ui>, <Ui>Хот</Ui> бөглөнө.
            </li>
            <li>
              <Ui>Зураг сонгох</Ui>-оор лого оруулна: PNG, JPEG эсвэл WebP, 1 MB хүртэл, дөрвөлжин зураг хамгийн тохиромжтой.
            </li>
            <li>«Баг үүсгэх» дарна. Дараа нь багийн хуудас нээгдэнэ.</li>
          </Steps>
          <H3>Тоглогчид (бүрэлдэхүүн)</H3>
          <Bullets>
            <li>
              Багийн хуудсанд <Ui>Ник нэр</Ui>, <Ui>Бүтэн нэр</Ui>, <Ui>Үүрэг</Ui> оруулж «Нэмэх» дарна.
            </li>
            <li>Нэг багт хамгийн ихдээ 5 тоглогч, 1 сэлгээ, 1 дасгалжуулагч бүртгэнэ.</li>
            <li>Тоглогч дээр дарж засна, «Хасах»-аар хасна.</li>
          </Bullets>
          <H3>Засах, устгах</H3>
          <Bullets>
            <li>Багийн нэр, товчлол, логог хүссэн үедээ сольж болно. Шинэ лого сайтад шууд шинэчлэгдэнэ.</li>
            <li>Тоглолтод оролцсон багийг устгах боломжгүй. Эхлээд тэр багийн тоглолтуудыг устгах хэрэгтэй.</li>
          </Bullets>
        </Topic>

        <Topic id="groups">
          <H3>Групп үүсгэх</H3>
          <Steps>
            <li>
              «Группүүд» хуудсанд <Ui>Шинэ группийн нэр</Ui> (жишээ нь «Групп A») оруулж «Групп нэмэх» дарна.
            </li>
            <li>
              Групп бүрийн <Ui>Баг нэмэх</Ui> жагсаалтаас баг сонгож «Нэмэх» дарна. Нэг баг зөвхөн нэг группт байна.
            </li>
            <li>Группийн нэрийг харандаан тэмдэг дээр дарж засна.</li>
          </Steps>
          <H3>Группийн тоглолт нэмэх</H3>
          <Steps>
            <li>
              Группийн доорх хэсэгт <Ui>Баг 1</Ui>, <Ui>Баг 2</Ui>, <Ui>Огноо, цаг</Ui>, <Ui>Формат</Ui>-ыг сонгоно.
            </li>
            <li>
              «Хараахан товлоогүй хосууд» гэсэн товчлууруудаас дарвал хоёр баг автоматаар сонгогдоно. Бүх хос товлогдох хүртэл энэ жагсаалт харагдана.
            </li>
            <li>«Тоглолт нэмэх» дарна. Хуудас солигдохгүй тул дараагийн тоглолтыг шууд нэмж болно.</li>
          </Steps>
          <H3>Тэнцсэн үеийн дараалал</H3>
          <p>
            Оноо, картын зөрүү, раундын зөрүү, хоорондын тоглолт бүгд тэнцсэн ховор үед багийн хажууд байгаа <Ui>Дараалал</Ui>{" "}
            талбарт тоо оруулна (1 = дээд байр). Бусад үед хоосон үлдээнэ.
          </p>
          <Tip tone="warn">
            Багийг группээс хасахад тухайн багийн <b>товлогдсон</b> тоглолтууд устна. Эхэлсэн тоглолттой группийг устгах боломжгүй.
          </Tip>
        </Topic>

        <Topic id="matches">
          <Bullets>
            <li>
              «Тоглолтууд» хуудас бүх тоглолтыг цагийн дарааллаар харуулна. Дээд талын шүүлтүүрээр төлөв (Шууд / Товлогдсон / Дууссан), үе шат
              (Групп / Плей-офф), группээр шүүнэ.
            </li>
            <li>
              «Шинэ тоглолт» нь группийн тоглолтыг тусад нь үүсгэх өөр нэг арга. <Ui>Нэр (заавал биш)</Ui>,{" "}
              <Ui>Шууд дамжуулалтын холбоос</Ui> (Twitch, YouTube), <Ui>Тэмдэглэл</Ui> зэргийг энд бөглөж болно.
            </li>
            <li>Тоглолт дээр дарвал «Тоглолт удирдах» хуудас нээгдэнэ. Доод хэсэгт нь тоглолтын мэдээллийг засах форм бий.</li>
            <li>Плей-оффын тоглолтыг энд биш, «Плей-офф» хуудаснаас нэмж устгана.</li>
          </Bullets>
        </Topic>

        <Topic id="live">
          <p>Тоглолт явагдаж байх үед «Тоглолт удирдах» хуудсыг нээгээд дараах дарааллаар ажиллана. Утсан дээр ч бүрэн ажиллана.</p>
          <Steps>
            <li>
              «Тоглолт эхлүүлэх» дарна. Тоглолт нийтийн сайтад <b>ШУУД</b> тэмдэгтэй гарна. Хоёр баг тодорхой болоогүй бол эхлүүлэх боломжгүй.
            </li>
            <li>
              Pick/ban дууссаны дараа «Карт нэмэх»-ээр картуудыг дарааллаар нь нэмнэ. Карт бүрт нэр, хэн сонгосныг (pick) эсвэл decider
              эсэхийг сонгоно.
            </li>
            <li>
              Раундын оноог <b>−</b> / <b>+</b> товчоор эсвэл тоог шууд бичиж оруулна. Өөрчлөлт бүр автоматаар хадгалагдана: «Хадгалж байна» →
              «Хадгалсан».
            </li>
            <li>
              Картын төлөвийг <Ui>Хүлээгдэж буй</Ui> / <Ui>Явагдаж буй</Ui> / <Ui>Дууссан</Ui> гэж сольно. Оноо 13 хүрэх (эсвэл overtime
              дуусах) үед «Карт дуусгах» товч гарч ирнэ.
            </li>
            <li>
              Аль нэг баг шаардлагатай тооны карт хожиход (BO3 бол 2, BO5 бол 3) «Тоглолт дуусгах» гэсэн санал гарна. Дарахад тоглолт дуусч,
              ялагч тодорно.
            </li>
          </Steps>
          <Bullets>
            <li>
              Алдаа гаргасан бол «Дахин нээх» дарж засна, эсвэл «Товлогдсон руу буцаах»-аар эхлэхээс өмнөх төлөвт оруулна.
            </li>
            <li>«Хасах» нь сүүлийн картыг устгана.</li>
            <li>
              <b>Техникийн ялалт:</b> баг ирээгүй эсвэл хасагдсан үед «… ялагч» товчоор ялагчийг гараар тогтооно. Тоглолт шууд дуусна. Буцаах
              бол «Техникийн ялалтыг цуцлах» дарна.
            </li>
          </Bullets>
          <Tip>
            Карт зөвхөн <Ui>Дууссан</Ui> төлөвтэй үед тоологдоно. Явагдаж буй картын оноо сайтад харагдах ч хүснэгтэд нөлөөлөхгүй.
          </Tip>
          <Tip tone="warn">
            Нэг тоглолтыг хоёр хүн зэрэг засвал хоёр дахь хүнд «өөр газраас өөрчилсөн» гэсэн мэдэгдэл гарна. Тэр үед хуудсаа шинэчилнэ. Нэг
            тоглолтыг нэг л админ удирдах нь зөв.
          </Tip>
        </Topic>

        <Topic id="schedule">
          <Bullets>
            <li>Бүх тоглолтын цаг, формат, багийг нэг хуудаснаас засна. Тоглолтууд групп болон плей-оффоор хуваагдана.</li>
            <li>Мөр засахад тодорч харагдана. Мөр бүрийн «Хадгалах» товчийг тус тусад нь дарна.</li>
            <li>Цаг бүгд Улаанбаатарын цагаар (UTC+8).</li>
            <li>Эхэлсэн эсвэл дууссан тоглолтын зөвхөн цаг, форматыг өөрчилнө. Багийг солихгүй.</li>
            <li>Группийн тоглолтод зөвхөн тухайн группийн багуудыг сонгоно.</li>
          </Bullets>
        </Topic>

        <Topic id="playoff">
          <p>
            Плей-оффын бүтцийг «Тохиргоо» → <Ui>Шатны төрөл</Ui>-өөс сонгоно. Аль ч төрөлд тоглолт дуусахад ялагч (холбосон бол ялагдагч ч
            бас) дараагийн тоглолтод <b>автоматаар</b> шилжинэ.
          </p>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <caption className="sr-only">Плей-оффын төрлүүд</caption>
              <thead className="bg-muted/60 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">Төрөл</th>
                  <th scope="col" className="px-3 py-2 font-medium">Багийн тоо</th>
                  <th scope="col" className="px-3 py-2 font-medium">Юу болох вэ</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="px-3 py-2 font-medium">Нэг хасагдалттай</td>
                  <td className="px-3 py-2">4, 8, 16</td>
                  <td className="px-3 py-2">Ялагдсан баг хасагдана. Финалын ялагч аварга.</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">Хоёр хасагдалттай</td>
                  <td className="px-3 py-2">4, 8, 16</td>
                  <td className="px-3 py-2">Дээд шатанд ялагдсан баг доод шат руу орно. Гранд финалд reset байхгүй.</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">Шигшээ + финалын тойрог</td>
                  <td className="px-3 py-2">4, 6, 8</td>
                  <td className="px-3 py-2">Нэг шигшээ тойрог, ялагчид нь хоорондоо тойргоор тоглож аварга тодорно.</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">Чөлөөт</td>
                  <td className="px-3 py-2">Хязгааргүй</td>
                  <td className="px-3 py-2">Шат, тоглолт, холбоос бүрийг админ өөрөө бүтээнэ.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <H3>Бэлэн загвар (эхний гурван төрөл)</H3>
          <Steps>
            <li>«Плей-офф» хуудсанд 1-р тойргийн тоглолт бүрийн хоёр багийг сонгоно.</li>
            <li>
              «Группийн байраар бөглөх» товч группийн хүснэгтээс санал болгоно (жишээ нь A1–B2, B1–C2, C1–A2). Хүсвэл гараар сольж болно.
              «Цэвэрлэх» бүх сонголтыг арилгана.
            </li>
            <li>
              <Ui>Тоглолтын формат</Ui> болон финалын форматыг сонгоод «Шат үүсгэх» дарна.
            </li>
            <li>Хоосон үлдсэн байрыг дараа нь «Хуваарь» эсвэл тоглолтын хуудаснаас бөглөж болно.</li>
          </Steps>
          <Tip tone="warn">
            «Шатыг дахин үүсгэх» нь одоогийн бүх плей-оффын тоглолтыг устгаж шинээр үүсгэнэ. Плей-офф эхэлсэн бол дахин үүсгэх боломжгүй.
          </Tip>

          <H3>Чөлөөт бүтээгч</H3>
          <Steps>
            <li>
              Хуудасны доод талын «Шат нэмэх» хэсэгт <Ui>Шатны нэр</Ui> (жишээ нь «Хагас шигшээ») оруулж <Ui>Төрөл</Ui>-ийг сонгоно:
              <Bullets>
                <li>
                  <b>Шууд хасагдах</b>: ялсан баг дараагийн шатанд гарч, ялагдсан баг хасагдана.
                </li>
                <li>
                  <b>Тойргийн</b>: баг бүр бусадтайгаа нэг удаа тоглож, хүснэгтээр эрэмбэлэгдэнэ. <Ui>Тодруулах байр</Ui> нь хүснэгтийн
                  дээд хэдэн байрыг тодруулахыг заана.
                </li>
              </Bullets>
            </li>
            <li>Шатуудыг сум товчоор дээш/доош зөөж дарааллыг тогтооно. Сүүлийн шат бол финал.</li>
            <li>
              «Шууд хасагдах» шатанд «Тоглолт нэмэх» дарж тоглолт нэмнэ. Тоглолт бүрийн хоёр байрт дараах гурвын нэгийг сонгоно:
              <Bullets>
                <li>баг (группийн байраар эрэмбэлэгдсэн: A1, A2, B1…);</li>
                <li>
                  өмнөх тоглолтын <b>ялагч</b> (жишээ нь «M1 · … — ялагч»);
                </li>
                <li>
                  өмнөх тоглолтын <b>ялагдагч</b> (жишээ нь 3-р байрын тоглолтод).
                </li>
              </Bullets>
              Дараа нь мөрийн «Хадгалах» товчийг дарна.
            </li>
            <li>
              «Тойргийн» шат хоосон байхад «Тойргийн тоглолтууд үүсгэх» форм гарна. Оролцогчийн тоог (2–8) сонгож, оролцогч бүрийг баг эсвэл өмнөх
              тоглолтын ялагч/ялагдагчаар сонгоод «Тойрог үүсгэх» дарна. Бүх хосын тоглолт автоматаар үүснэ.
            </li>
          </Steps>
          <Bullets>
            <li>Тоглолтууд M1, M2… гэж дугаарлагдана. Сайт дээр баг тодроогүй байрыг «M2 ялагч» гэж харуулна.</li>
            <li>Аль хэдийн дууссан тоглолтыг холбовол ялагч/ялагдагч нь шууд байрандаа орно. Холбоосыг сольвол баг ч солигдоно.</li>
            <li>Тоглолтыг өөр шат руу зөөх бол мөрийн шатны жагсаалтаас сонгоод хадгална.</li>
            <li>
              <b>Аварга</b>: сүүлийн шат ганц тоглолттой бол түүний ялагч, тойргийн шат бол хүснэгтийн 1-р байр. Сүүлийн шатны бүх тоглолт
              дуусахад сайтад «Аварга» туг гарна.
            </li>
            <li>«Шатанд хамаараагүй тоглолтууд» хэсэгт өмнөх загвараас үлдсэн тоглолтууд гарна. Шат сонгож оруулж болно.</li>
            <li>«Бүх тоглолтыг устгах» нь бүх плей-оффын тоглолтыг устгана. Шатууд үлдэнэ.</li>
          </Bullets>

          <H3>Үр дүн засах</H3>
          <p>
            Дууссан тоглолтын үр дүнг засвал дараагийн тоглолт дахь баг автоматаар солигдоно. Гэхдээ дараагийн тоглолт аль хэдийн эхэлсэн бол
            засах боломжгүй. Эхлээд тэр тоглолтыг «Товлогдсон руу буцаах» хэрэгтэй. Гараар тавьсан багийг автомат шилжилт дарж бичихгүй.
          </p>
        </Topic>

        <Topic id="rules">
          <H3>Картын оноо (CS2 MR12)</H3>
          <Bullets>
            <li>Үндсэн хугацаанд 13 раунд авсан баг картыг хожно (жишээ нь 13:11).</li>
            <li>12:12 болбол overtime: 6 раундын блокт 4 авсан баг хожно (16:14, 19:17 …).</li>
            <li>Систем «Карт дуусгах»-ыг санал болгодог ч хүлээлгэхгүй: картыг хэзээ дуусгахыг админ шийднэ.</li>
          </Bullets>
          <H3>Тоглолтын ялагч</H3>
          <Bullets>
            <li>BO1: 1 карт, BO3: 2 карт, BO5: 3 карт хожсон баг ялна.</li>
            <li>Техникийн ялалтаар тогтоосон ялагч картын оноог үл харгалзана.</li>
          </Bullets>
          <H3>Группийн хүснэгтийн байр</H3>
          <Steps>
            <li>Оноо (ялалт, ялагдлын оноо тохиргооноос)</li>
            <li>Картын зөрүү (хожсон − алдсан карт)</li>
            <li>Раундын зөрүү</li>
            <li>Тэнцсэн багуудын хоорондын тоглолтын ялалт</li>
            <li>Админы тогтоосон «Дараалал»</li>
          </Steps>
          <p>Тойргийн плей-оффын хүснэгт ч мөн энэ дүрмээр эрэмбэлэгдэнэ. Зөвхөн дууссан тоглолт хүснэгтэд тоологдоно.</p>
        </Topic>

        <Topic id="faq">
          <dl className="space-y-3">
            {[
              [
                "«Энэ тоглолтыг өөр газраас өөрчилсөн байна»",
                "Өөр админ эсвэл өөр цонх тэр тоглолтыг зэрэг засварласан. Хуудсаа шинэчлээд дахин оролдоно уу.",
              ],
              [
                "«Дараагийн шатны тоглолт эхэлсэн тул энэ үр дүнг өөрчлөх боломжгүй»",
                "Ялагч орох ёстой тоглолт аль хэдийн эхэлсэн байна. Тэр тоглолтыг «Товлогдсон руу буцаах»-аар буцааж байж засна.",
              ],
              [
                "«Хоёр баг тодорхой болсны дараа эхлүүлнэ»",
                "Тоглолтын нэг байр хоосон байна. «Хуваарь» эсвэл тоглолтын хуудаснаас багийг сонгоно уу.",
              ],
              [
                "«Ялагч тодорхойгүй байна»",
                "Хожсон картын тоо тэнцүү байна. Картын оноо, төлөвийг шалгах эсвэл техникийн ялалтаар ялагчийг тогтооно уу.",
              ],
              [
                "Сайт дээр хүснэгт, шат шинэчлэгдэхгүй байна",
                "Оноо шууд шинэчлэгддэг. Хүснэгт, плей-оффын зам 15 секунд хүртэл хоцорч шинэчлэгдэж болно. Хуудсаа шинэчилнэ үү.",
              ],
              [
                "Баг, групп устгагдахгүй байна",
                "Эхэлсэн эсвэл дууссан тоглолттой бол устгах боломжгүй. Эхлээд тэдгээр тоглолтыг устгах эсвэл «Товлогдсон» төлөвт буцаана.",
              ],
            ].map(([q, a]) => (
              <div key={q} className="rounded-md border p-3">
                <dt className="font-semibold">{q}</dt>
                <dd className="mt-1 text-muted-foreground">{a}</dd>
              </div>
            ))}
          </dl>
        </Topic>
      </div>
    </>
  );
}
