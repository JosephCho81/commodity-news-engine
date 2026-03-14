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


// 1️⃣ 이미 오늘 뉴스가 있는지 확인
const todayDoc = await getDoc(doc(db,"daily_news",today))

if(todayDoc.exists()){
 return res.json({
 status:"already-exists",
 data: todayDoc.data()
 })
}


// 2️⃣ 뉴스 API 호출
const news = await fetch(
`https://newsapi.org/v2/everything?q=aluminum OR scrap OR iron OR copper&language=en&pageSize=10&apiKey=YOUR_NEWS_API_KEY`
)

const newsData = await news.json()


// 3️⃣ LME 가격
const lme = await fetch(
"https://query1.finance.yahoo.com/v7/finance/quote?symbols=ALI=F"
)

const lmeData = await lme.json()

const lmePrice =
lmeData.quoteResponse.result[0]?.regularMarketPrice || null



// 4️⃣ AI 분석
const ai = await fetch(
"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_GEMINI_KEY",
{
method:"POST",
headers:{ "Content-Type":"application/json"},
body:JSON.stringify({

contents:[{
parts:[{
text:`

다음 원자재 뉴스를 분석해서
한국 제강사 원료구매팀 임원 보고용으로 정리해라.

조건
1. 5줄 요약
2. 핵심 뉴스 5개
3. 알루미늄 시장 영향
4. 스크랩 시장 영향

뉴스 데이터:
${JSON.stringify(newsData.articles)}

`
}]
}]

})
}
)

const aiResult = await ai.json()

const briefing =
aiResult?.candidates?.[0]?.content?.parts?.[0]?.text || ""



// 5️⃣ Firebase 저장
await setDoc(doc(db,"daily_news",today),{

date: today,

daily_briefing: briefing,

lme_aluminum: lmePrice,

news: newsData.articles.slice(0,10).map(n => ({
title:n.title,
url:n.url,
summary:n.description
}))

})



res.json({
status:"saved",
date:today
})

}
