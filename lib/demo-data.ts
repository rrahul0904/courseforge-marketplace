export const courses = [
  {slug:"production-ai-agents",title:"Production AI Agents",summary:"Build, evaluate and operate durable AI-agent workflows.",category:"AI Engineering",level:"Advanced",instructor:"Maya Chen",rating:4.9,learners:3821,price:129},
  {slug:"modern-data-platforms",title:"Modern Data Platforms",summary:"Design scalable lakehouse and warehouse architectures for real teams.",category:"Data Engineering",level:"Intermediate",instructor:"Arjun Rao",rating:4.8,learners:2147,price:99},
  {slug:"founder-analytics",title:"Founder Analytics",summary:"Build the metrics, experiments and dashboards that guide product decisions.",category:"Business",level:"Beginner",instructor:"Lena Brooks",rating:4.7,learners:1640,price:79}
];

export function getCourse(slug:string){return courses.find(course=>course.slug===slug)}
