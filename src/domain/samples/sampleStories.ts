import type { ArticleBody, BodyNode, Inline } from '../entities/Article';

/** Images referenced by sample stories as `sample:<key>`; the app draws them on demand. */
export const SAMPLE_IMAGE_KEYS = ['city', 'reservoir', 'field', 'stadium', 'school', 'kites'] as const;
export type SampleImageKey = (typeof SAMPLE_IMAGE_KEYS)[number];

export interface SampleStory {
  readonly headline: string;
  readonly subHeadline: string;
  readonly byline: string;
  readonly dateline?: string;
  readonly body: ArticleBody;
}

const t = (text: string, marks?: Inline['marks']): Inline => (marks ? { text, marks } : { text });
const p = (...runs: (string | Inline)[]): BodyNode => ({
  type: 'paragraph',
  children: runs.map((r) => (typeof r === 'string' ? t(r) : r)),
});
const sub = (text: string): BodyNode => ({ type: 'subhead', children: [t(text)] });
const quote = (text: string): BodyNode => ({ type: 'pullquote', children: [t(text)] });
const list = (...items: string[]): BodyNode => ({
  type: 'list',
  ordered: false,
  items: items.map((i) => [t(i)]),
});
const img = (key: SampleImageKey, caption: string): BodyNode => ({
  type: 'image',
  assetId: `sample:${key}`,
  caption,
});

/** Invented stories for trying out the editor and layout. Nothing here reports real events. */
export const SAMPLE_STORIES: readonly SampleStory[] = [
  {
    headline: 'హైదరాబాద్‌లో మెట్రో రెండో దశకు శ్రీకారం',
    dateline: 'హైదరాబాద్:',
    subHeadline: 'కొత్త మార్గాలతో లక్షలాది ప్రయాణికులకు ఊరట',
    byline: 'నమూనా · స్టాఫ్ రిపోర్టర్, హైదరాబాద్',
    body: [
      p(
        'నగరంలో మెట్రో రైలు రెండో దశ పనులకు ఈరోజు అధికారికంగా శ్రీకారం చుట్టారు. కొత్త మార్గాల్లో ప్రయాణం ప్రారంభమైతే రోజుకు లక్షలాది మంది ప్రయాణికులకు ట్రాఫిక్ ఇబ్బందుల నుంచి ఉపశమనం లభిస్తుందని అధికారులు తెలిపారు.',
      ),
      img('city', 'నిర్మాణంలో ఉన్న మెట్రో మార్గం (నమూనా చిత్రం)'),
      p(
        'మొత్తం యాభై కిలోమీటర్లకు పైగా విస్తరించనున్న ఈ ప్రాజెక్టులో ఇరవైకి పైగా కొత్త స్టేషన్లు నిర్మిస్తారు. పనులను మూడేళ్లలో పూర్తి చేయాలని లక్ష్యంగా పెట్టుకున్నారు.',
      ),
      sub('ప్రయాణికులకు సౌకర్యాలు'),
      p(
        'ప్రతి స్టేషన్‌లో లిఫ్టులు, ఎస్కలేటర్లు, దివ్యాంగులకు ప్రత్యేక సౌకర్యాలు ఏర్పాటు చేస్తారు. సౌర విద్యుత్ ద్వారా స్టేషన్ల అవసరాలు తీర్చేలా ప్రణాళిక సిద్ధం చేశారు.',
      ),
      quote('ప్రజా రవాణా బలపడితే నగరం స్వేచ్ఛగా శ్వాస తీసుకుంటుంది'),
      p(
        'స్థల సేకరణ, పరిహారం వంటి అంశాల్లో స్థానికుల అభిప్రాయాలు తీసుకుంటామని అధికారులు స్పష్టం చేశారు. త్వరలో పౌర సలహా సమావేశాలు నిర్వహించనున్నారు.',
      ),
      p(
        'మొదటి దశలో అనుభవాలను దృష్టిలో ఉంచుకుని, ఈసారి టికెట్ వ్యవస్థను పూర్తిగా డిజిటల్ చేయనున్నట్లు తెలిసింది. బస్సులు, మెట్రో మధ్య సులభంగా మారేలా ఒకే కార్డు అందుబాటులోకి వస్తుంది.',
      ),
    ],
  },
  {
    headline: 'Monsoon rains ease reservoir worries across the state',
    dateline: 'HYDERABAD:',
    subHeadline: 'Storage levels cross the seasonal average for the first time in three years',
    byline: 'Sample · Staff Reporter, Hyderabad',
    body: [
      p(
        'Steady rain over the past fortnight has lifted storage in the major reservoirs above the seasonal average, easing fears of a difficult summer for drinking water and irrigation, officials said on Thursday.',
      ),
      img('reservoir', 'Water released from the main dam as inflows rise (sample image)'),
      p(
        'Inflows have been strongest in the upper catchment areas, where several districts recorded more than double their normal rainfall this month. Engineers said the gates would be opened in stages to avoid flooding downstream.',
      ),
      sub('What it means for farmers'),
      p(
        'Irrigation departments expect to release canal water two weeks earlier than last year, giving farmers a longer window for sowing. ',
        t('Officials urged growers to plan crops carefully', ['bold']),
        ' and not to rely on a single wet spell.',
      ),
      list(
        'Canal water to be released from the first week of next month',
        'Helplines opened in every district headquarters',
        'Flood alerts to be sent to villages along the river banks',
      ),
      p(
        'Meteorologists forecast that the active phase of the monsoon will continue for another ten days before weakening.',
      ),
    ],
  },
  {
    headline: 'రైతులకు రాయితీపై విత్తన పంపిణీ ప్రారంభం',
    dateline: 'అమరావతి:',
    subHeadline: 'రైతు సేవా కేంద్రాల్లో ఈ నెలాఖరు వరకు అందుబాటులో',
    byline: 'నమూనా · వ్యవసాయ విభాగం ప్రతినిధి',
    body: [
      p(
        'ఖరీఫ్ సాగు కోసం రైతులకు రాయితీపై విత్తనాల పంపిణీ రాష్ట్రవ్యాప్తంగా ప్రారంభమైంది. వరి, పత్తి, కంది విత్తనాలను రైతు సేవా కేంద్రాల ద్వారా అందిస్తున్నారు.',
      ),
      img('field', 'పచ్చని పొలాల్లో సాగు పనులు (నమూనా చిత్రం)'),
      p(
        'పట్టాదారు పాస్‌పుస్తకం, ఆధార్ కార్డుతో కేంద్రానికి వెళ్లి విత్తనాలు తీసుకోవచ్చని అధికారులు సూచించారు. సన్న, చిన్నకారు రైతులకు అదనపు రాయితీ ఉంటుంది.',
      ),
      p(
        'నాణ్యత లేని విత్తనాలు విక్రయిస్తే కఠిన చర్యలు తీసుకుంటామని హెచ్చరించారు. ఫిర్యాదుల కోసం ప్రతి జిల్లాలో ప్రత్యేక హెల్ప్‌లైన్ నంబర్ ఏర్పాటు చేశారు.',
      ),
    ],
  },
  {
    headline: 'Local XI clinch district cricket title with last-over finish',
    dateline: 'WARANGAL:',
    subHeadline: 'Captain’s unbeaten 64 steers chase after early collapse',
    byline: 'Sample · Sports Desk',
    body: [
      p(
        'A calm unbeaten 64 from the captain guided the home side to a three-wicket victory in the district final on Sunday, sealing the title with two balls to spare after a shaky start to the chase.',
      ),
      img('stadium', 'The home crowd celebrates the winning runs (sample image)'),
      p(
        'Chasing 168, the hosts were reduced to 41 for four in the seventh over. A fifth-wicket stand of 72 turned the match, and the middle order held its nerve when the equation came down to nine off the final over.',
      ),
      quote('We never stopped believing. The crowd carried us home.'),
      p(
        'The winning team receives a trophy and a place in the state-level qualifiers next month.',
      ),
    ],
  },
  {
    headline: 'ప్రభుత్వ పాఠశాలల్లో డిజిటల్ తరగతుల విస్తరణ',
    dateline: 'విజయవాడ:',
    subHeadline: 'మొదటి విడతలో వెయ్యి బడులకు స్మార్ట్ బోర్డులు',
    byline: 'నమూనా · విద్యా విభాగం ప్రతినిధి',
    body: [
      p(
        'రాష్ట్రంలోని ప్రభుత్వ పాఠశాలల్లో డిజిటల్ తరగతుల ఏర్పాటుకు విద్యాశాఖ చర్యలు ప్రారంభించింది. మొదటి విడతలో వెయ్యి పాఠశాలలకు స్మార్ట్ బోర్డులు, ఇంటర్నెట్ సౌకర్యం కల్పించనున్నారు.',
      ),
      img('school', 'డిజిటల్ తరగతులు ప్రారంభం కానున్న ఒక ప్రభుత్వ పాఠశాల (నమూనా చిత్రం)'),
      p(
        'ఉపాధ్యాయులకు శిక్షణ ఇచ్చిన తర్వాతే పరికరాలను వినియోగంలోకి తెస్తామని అధికారులు తెలిపారు. తెలుగు, ఆంగ్ల మాధ్యమాల్లో పాఠ్యాంశాల డిజిటల్ కంటెంట్ సిద్ధం చేస్తున్నారు.',
      ),
    ],
  },
  {
    headline: 'Gold steady, markets cautious',
    subHeadline: 'బంగారం ధరలు స్థిరం, మార్కెట్లలో జాగ్రత్త',
    byline: 'Sample · Business Desk / వాణిజ్య విభాగం',
    body: [
      p(
        'Gold prices held steady in the local bullion market on Thursday as traders waited for global cues, while equity indices ended the session marginally lower.',
      ),
      p(
        'స్థానిక బులియన్ మార్కెట్‌లో బంగారం ధరలు గురువారం స్థిరంగా కొనసాగాయి. అంతర్జాతీయ సూచనల కోసం వ్యాపారులు ఎదురుచూస్తున్నారు. షేర్ మార్కెట్ సూచీలు స్వల్ప నష్టాలతో ముగిశాయి.',
      ),
      p(
        'Analysts said buying may pick up ahead of the festival season, although higher import costs could keep jewellery prices elevated.',
      ),
    ],
  },
  {
    headline: 'సంక్షిప్త వార్తలు',
    subHeadline: '',
    byline: 'నమూనా',
    body: [
      list(
        'నగరంలో రేపు కొన్ని ప్రాంతాల్లో విద్యుత్ సరఫరాలో అంతరాయం ఉంటుందని అధికారులు తెలిపారు.',
        'జిల్లా గ్రంథాలయంలో పుస్తక ప్రదర్శన ఈ నెల పదో తేదీ నుంచి ప్రారంభం కానుంది.',
        'బస్ పాస్ రాయితీ గడువును వచ్చే నెల చివరి వరకు పొడిగించారు.',
        'వాతావరణ శాఖ: రాబోయే రెండు రోజులు తేలికపాటి వర్షాలు కురిసే అవకాశం.',
      ),
    ],
  },
  {
    headline: 'A city runs on its night buses',
    subHeadline: 'Editorial',
    byline: 'Sample · Opinion',
    body: [
      p(
        'Every night, long after the offices empty and the metro shuts, a few hundred buses keep the city moving. Nurses, security guards, delivery riders and printers head home on them. They rarely feature in transport plans, yet they decide whether the city works for everyone.',
      ),
      quote('A service that runs only when it is convenient is not a public service.'),
      p(
        'Cutting night routes may save money on paper, but the cost returns as unsafe journeys, lost shifts and private vehicles on the road. The corporation should publish route-wise ridership, restore the withdrawn services and tie any future cut to a public hearing.',
      ),
      p(
        'Good transport is judged not by its busiest hour but by its loneliest one.',
      ),
    ],
  },
  {
    headline: 'సంక్రాంతి సంబరాలకు సన్నాహాలు',
    dateline: 'తిరుపతి:',
    subHeadline: 'పతంగుల ఉత్సవం, ముగ్గుల పోటీలకు ఏర్పాట్లు',
    byline: 'నమూనా · సాంస్కృతిక ప్రతినిధి',
    body: [
      p(
        'సంక్రాంతి పండుగను పురస్కరించుకుని నగరంలో మూడు రోజుల సాంస్కృతిక ఉత్సవాలకు ఏర్పాట్లు జరుగుతున్నాయి. పతంగుల ఉత్సవం, ముగ్గుల పోటీలు, జానపద కళల ప్రదర్శనలు ప్రధాన ఆకర్షణలుగా నిలవనున్నాయి.',
      ),
      img('kites', 'ఆకాశమంతా రంగురంగుల పతంగులు (నమూనా చిత్రం)'),
      p(
        'విజేతలకు బహుమతులు అందజేస్తామని నిర్వాహకులు తెలిపారు. పాల్గొనాలనుకునేవారు ముందుగా పేర్లు నమోదు చేసుకోవాలని సూచించారు.',
      ),
    ],
  },
];
