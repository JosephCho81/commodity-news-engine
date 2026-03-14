import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

export default async function handler(req, res) {

const today = new Date().toISOString().slice(0,10)

// Firebase 설정
const firebaseConfig = {
 apiKey: "YOUR_FIREBASE_API_KEY",
 authDomain: "YOUR_PROJECT.firebaseapp.com",
 projectId: "YOUR_PROJECT_ID",
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)


// 1️⃣ 오늘 뉴스 이미 있는지 확인
const todayDoc = await getDoc(doc(db,"daily_news",today))

if(todayDoc.exists()){
 return res.json({
  status:"already-exists",
  data: todayDoc.data()
 })
}


// 2️⃣ LME 알루미늄 가격 가져오기
const lmeRes = await fetch(
"https://query1.finance.yahoo.com/v7/finance/quote?symbols=ALI=F"
)

const lmeData = await lmeRes.json()

const lmePrice =
lmeData.quoteResponse.result[0]?.regularMarketPrice || null



// 3️⃣ Google News RSS 가져오기
const rssRes = await fetch(
"https://news.google.com/rss/search?q=aluminum OR steel OR scrap OR iron ore&hl=en-US&gl=US&ceid=US:en"
)

const xml = await rssRes.text()


// RSS 파싱
const items = xml.split("<item>").slice(1,60)

const articles = items.map(item => {

const title = item.match(/<title>(.*?)<\/title>/)?.[1] || ""
const link = item.match(/<link>(.*?)<\/link>/)?.[1] || ""
const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || ""

return {
 title,
 url: link,
 date: pubDate
}

})


// 4️⃣ Gemini AI 분석
const aiRes = await fetch(
"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_GEMINI_API_KEY",
{
 method:"POST",
 headers:{
  "Content-Type":"application/json"
 },
 body:JSON.stringify({

 contents:[{
  parts:[{
   text:`

다음 뉴스 데이터를 분석해서
한국 제강사 원료구매팀 임원 보고용 시장 요약을 작성하라.

조건
- 5줄 요약
- 핵심 뉴스 10개
- 알루미늄 시장 영향
- 철스크랩 시장 영향
- 철광석 시장 영향

뉴스 데이터:
${JSON.stringify(articles)}

`
  }]
 }]

 })
}
)

const aiData = await aiRes.json()

const briefing =
aiData?.candidates?.[0]?.content?.parts?.[0]?.text || ""


// 5️⃣ Firebase 저장
await setDoc(doc(db,"daily_news",today),{

date: today,

lme_aluminum: lmePrice,

daily_briefing: briefing,

news: articles.slice(0,20)

})


// 6️⃣ 결과 반환
res.json({

status:"saved",

date:today,

lme:lmePrice,

news_count:articles.length

})

}
