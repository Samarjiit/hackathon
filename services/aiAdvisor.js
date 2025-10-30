const { ChatOpenAI } = require("@langchain/openai")
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai")
const { PromptTemplate } = require("@langchain/core/prompts")
const { StringOutputParser } = require("@langchain/core/output_parsers")
const { RunnableSequence } = require("@langchain/core/runnables")
// ✅ Lightweight charting with canvas
const { createCanvas } = require("canvas")
const Chart = require("chart.js/auto")
// ✅ Database service for real user data
const DatabaseService = require("./dataService")

class AIFinancialAdvisor {
  constructor() {
    this.models = { openai: null, google: null, anthropic: null }
    this.initializeModels()
    this.initializeAgents()
  }

  initializeModels() {
    // Initialize OpenAI if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.models.openai = new ChatOpenAI({
        modelName: "gpt-4-turbo-preview",
        temperature: 0.3,
        openAIApiKey: process.env.OPENAI_API_KEY,
      })
      console.log("✅ OpenAI model initialized")
    }

    // Initialize Google AI if API key is available
    console.log(
      "🔍 Checking Google API key availability:",
      !!process.env.GOOGLE_API_KEY
    )
    if (process.env.GOOGLE_API_KEY) {
      try {
        this.models.google = new ChatGoogleGenerativeAI({
          model: "gemini-2.5-flash",
          temperature: 0.3,
          apiKey: process.env.GOOGLE_API_KEY,
        })
        console.log(
          "✅ Google AI model (Gemini 2.5 Flash) initialized successfully"
        )
      } catch (error) {
        console.error("❌ Failed to initialize Google AI model:", error.message)
      }
    } else {
      console.log("❌ GOOGLE_API_KEY not found in environment variables")
    }
  }

  getAvailableModel() {
    if (this.models.google)
      return { model: this.models.google, provider: "google" }
    if (this.models.openai)
      return { model: this.models.openai, provider: "openai" }
    // Return null if no models available - will be handled gracefully
    return null
  }

  initializeAgents() {
    try {
      const modelResult = this.getAvailableModel()

      // If no models available, create dummy agents that return fallback responses
      if (!modelResult) {
        console.log("⚠️ No AI models available - creating fallback agents")
        this.createFallbackAgents()
        return
      }

      const { model } = modelResult
      const createAgent = (name, prompt) =>
        RunnableSequence.from([
          PromptTemplate.fromTemplate(prompt),
          model,
          new StringOutputParser(),
        ])

      this.agents = {
        /*
      dataGenerator: createAgent(`
      You are a Financial Data Generator AI. Based on the given user profile, financial data, and user query, generate plausible chart data for financial visualization.

      User Profile: {userProfile}
      Financial Data: {financialData}
      User Query: {userQuery}
      Chart Type: {chartType}

      Return ONLY a JSON array of objects like:
      [{"label": "Category", "value": 123.45}]
        `),*/
        transactionSummarizer: createAgent(
          "TransactionSummarizer",
          `You are an AI Transaction Summarizer. Input: Raw transactions in JSON. Output: Summarize spending by category and overall monthly patterns in JSON. JSON ONLY.

Input: {transactionData}

Return ONLY valid JSON in this format:
{{
  "summary": "Brief summary text",
  "categories": {{ "category": amount }},
  "total": totalAmount,
  "monthlyPattern": "pattern description"
}}`
        ),
        spendingAnalysis: createAgent(
          "SpendingAnalysis",
          `You are an AI Spending Analysis Agent. Input: User profile and summarized transactions. Output: Key insights, concerns, recommendations, and potential savings in JSON. JSON ONLY.

Profile: {profile}
Transactions: {summarizedTransactions}

Return ONLY valid JSON in this format:
{{
  "insights": ["insight1", "insight2"],
  "concerns": ["concern1", "concern2"],
  "recommendations": ["rec1", "rec2"],
  "potentialSavings": amount
}}`
        ),
        goalOptimization: createAgent(
          "GoalOptimization",
          `You are an AI Goal Optimization Agent. Input: User profile, current goals, progress data. Output: Prioritized goals, strategies, timeline adjustments, overall advice in JSON. JSON ONLY.

Profile: {profile}
Goals: {goals}
Progress: {progress}

Return ONLY valid JSON in this format:
{{
  "prioritized_goals": ["goal1", "goal2"],
  "optimization_strategies": ["strategy1", "strategy2"],
  "timeline_adjustments": {{}},
  "advice": "overall advice"
}}`
        ),
        budgetPlanner: createAgent(
          "BudgetPlanner",
          `You are an AI Budget Planner. Input: User profile, preferences, financial context. Output: Personalized budget plan with categories, percentages, recommendations in JSON. JSON ONLY.

Profile: {profile}
Preferences: {preferences}

Return ONLY valid JSON in this format:
{{
  "categories": {{ "category": {{ "amount": 0, "percentage": 0 }} }},
  "budget_method": "method name",
  "recommendations": ["rec1", "rec2"]
}}`
        ),
        chartSelector: createAgent(
          "ChartSelector",
          `You are an AI Chart Selector. Input: Summarized data and insights. Output: Recommend chart type and description in JSON. JSON ONLY.

Data: {summarizedData}
Insights: {insights}

Return ONLY valid JSON in this format:
{{
  "type": "bar",
  "description": "Chart description",
  "title": "Chart title"
}}`
        ),
        dataFormatter: createAgent(
          "DataFormatter",
          `You are an AI Data Formatter. Input: Raw summarized data for visualization. Output: Properly formatted JSON for plotting charts. JSON ONLY.

Raw Data: {rawData}

Return ONLY valid JSON array in this format:
[{{ "label": "Category", "value": 123.45 }}]`
        ),
        financialAdvisor: createAgent(
          "FinancialAdvisor",
          `You are a top-tier Financial Advisor AI. Input: User profile, financial context, summarized transactions, insights, and goals. Output: Personalized advice, actionable insights, suggestions, visualization recommendations in JSON. JSON ONLY.

Profile: {profile}
Transactions: {summarizedTransactions}
Spending Insights: {spendingInsights}
Goals: {optimizedGoals}
Budget: {budgetPlan}
Chart: {chartRecommendation}
Data: {formattedChartData}
User Query: {userQuery}

Return ONLY valid JSON in this format:
{{
  "response": "Main response text",
  "insights": ["insight1", "insight2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "visualization": {{ "recommended": true, "type": "chart type" }},
  "followUpQuestions": ["question1", "question2"]
}}`
        ),
      }

      console.log("Agents initialized:", Object.keys(this.agents))
    } catch (error) {
      console.error("Failed to initialize agents:", error.message)
      console.log("⚠️ Creating fallback agents to allow server to start...")
      this.createFallbackAgents()
    }
  }

  createFallbackAgents() {
    // Create dummy agents that return fallback responses
    this.agents = {
      transactionSummarizer: {
        invoke: async () =>
          JSON.stringify({
            summary: "AI service temporarily unavailable",
            categories: { food: 500, transport: 300, utilities: 200 },
            total: 1000,
            monthlyPattern: "Regular spending pattern",
          }),
      },
      spendingAnalysis: {
        invoke: async () =>
          JSON.stringify({
            insights: ["AI analysis temporarily unavailable"],
            concerns: ["Please configure API keys for full functionality"],
            recommendations: ["Add GOOGLE_API_KEY to environment variables"],
            potentialSavings: 0,
          }),
      },
      goalOptimization: {
        invoke: async () =>
          JSON.stringify({
            prioritized_goals: ["Emergency fund", "Debt reduction"],
            optimization_strategies: [
              "Increase savings rate",
              "Reduce expenses",
            ],
            timeline_adjustments: {},
            advice: "AI advisor temporarily unavailable",
          }),
      },
      budgetPlanner: {
        invoke: async () =>
          JSON.stringify({
            categories: {
              housing: { amount: 1200, percentage: 30 },
              food: { amount: 400, percentage: 10 },
              transport: { amount: 300, percentage: 7.5 },
            },
            budget_method: "50/30/20 rule",
            recommendations: [
              "Configure AI service for personalized recommendations",
            ],
          }),
      },
      chartSelector: {
        invoke: async () =>
          JSON.stringify({
            type: "pie",
            description: "Basic spending breakdown",
            title: "Spending Categories",
          }),
      },
      dataFormatter: {
        invoke: async () =>
          JSON.stringify([
            { label: "Food", value: 500 },
            { label: "Transport", value: 300 },
            { label: "Utilities", value: 200 },
          ]),
      },
      financialAdvisor: {
        invoke: async () =>
          JSON.stringify({
            response:
              "AI Financial Advisor is temporarily unavailable. Please configure your API keys (GOOGLE_API_KEY or OPENAI_API_KEY) in your .env file to enable full AI functionality.",
            insights: ["Basic financial tracking is still available"],
            suggestions: [
              "Set up emergency fund",
              "Track spending categories",
              "Review monthly budget",
            ],
            visualization: { recommended: true, type: "pie" },
            followUpQuestions: [
              "Would you like to configure AI services?",
              "Need help with manual budget planning?",
            ],
          }),
      },
    }
    console.log(
      "✅ Fallback agents created - server can start without AI models"
    )
  }

  async safeParse(raw, fallback = {}) {
    try {
      const cleaned = raw.replace(/```json\s*|```\s*|\n/g, "").trim()
      const parsed = JSON.parse(cleaned)
      return parsed
    } catch (err) {
      console.warn("⚠️ JSON parse failed:", err.message)
      console.log("Raw AI output (first 200 chars):", raw.substring(0, 200))
      return fallback
    }
  }

  async generateChartImage(chartRecommendation, formattedChartData) {
    console.log("📊 Generating chart image with Chart.js...")

    // ✅ Check if canvas is available
    try {
      // Fallback if no data
      if (
        !Array.isArray(formattedChartData) ||
        formattedChartData.length === 0
      ) {
        console.warn("⚠️ No chart data available, using fallback")
        formattedChartData = [{ label: "No Data", value: 0 }]
      }

      const width = 800
      const height = 600
      const canvas = createCanvas(width, height)
      const ctx = canvas.getContext("2d")

      // Chart configuration
      const config = {
        type:
          chartRecommendation.type === "pie"
            ? "doughnut"
            : chartRecommendation.type || "bar",
        data: {
          labels: formattedChartData.map((d) => d.label || "Unknown"),
          datasets: [
              {
              label: "Amount (₹)",
              data: formattedChartData.map((d) => parseFloat(d.value) || 0),
              backgroundColor: [
                "#FF6384",
                "#36A2EB",
                "#FFCE56",
                "#4BC0C0",
                "#9966FF",
                "#FF9F40",
                "#FF6B6B",
                "#C9CBCF",
                "#4ECDC4",
                "#45B7D1",
              ],
              borderColor: "#fff",
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: false,
          animation: false,
          plugins: {
            title: {
              display: true,
              text:
                chartRecommendation.title ||
                chartRecommendation.description ||
                "Financial Chart",
              font: { size: 16, weight: "bold" },
            },
            legend: {
              display: true,
              position: "bottom",
            },
          },
          scales:
            chartRecommendation.type === "pie"
              ? {}
              : {
                    y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: "Amount (₹)",
                    },
                  },
                  x: {
                    title: {
                      display: true,
                      text: "Category",
                    },
                  },
                },
        },
      }

      // Create chart
      const chart = new Chart(ctx, config)

      // Get image buffer
      const imageBuffer = canvas.toBuffer("image/png")

      // Cleanup
      chart.destroy()

      console.log("✅ Chart image generated successfully")
      return imageBuffer
    } catch (err) {
      console.warn("⚠️ Chart generation failed:", err.message)
      return null
    }
  }

  async getRelevantAgents(query) {
    const modelResult = this.getAvailableModel()
    if (!modelResult) {
      console.warn("⚠️ No model available, falling back to all agents.")
      return [
        "transactionSummarizer",
        "spendingAnalysis",
        "goalOptimization",
        "budgetPlanner",
        "financialAdvisor",
        "chartSelector",
        "dataFormatter",
      ]
    }

    const { model } = modelResult

    const availableAgents = [
      "transactionSummarizer",
      "spendingAnalysis",
      "goalOptimization",
      "budgetPlanner",
    ]
    const agentList = availableAgents.map((name) => `- ${name}`).join("\n")

    const prompt = `
You are an expert AI selecting the most relevant financial subagents for a user's query.
Query: "${query}"

Available subagents:
${agentList}

Return only the top 2 subagents most relevant to this query in a JSON array, like:
["spendingAnalysis", "budgetPlanner"]

IMPORTANT: Return ONLY the JSON array, no other text.
`

    let top2 = ["spendingAnalysis", "budgetPlanner"] // Default fallback
    try {
      // ✅ Fixed: Added await and correct property access
      const response = await model.invoke(prompt)
      const responseText = response.content || response // ✅ Fixed: Use content property
      const parsed = JSON.parse(responseText.trim())
      if (Array.isArray(parsed)) {
        top2 = parsed.filter((agent) => availableAgents.includes(agent))
      }
    } catch (err) {
      console.warn("⚠️ Agent selection failed, using defaults:", err.message)
    }

    // Always append required agents
    const finalAgents = [
      ...new Set([
        ...top2,
        "financialAdvisor",
        "chartSelector",
        "dataFormatter",
      ]),
    ]
    console.log("📌 Selected agents:", finalAgents.join(", "))
    return finalAgents
  }

  async summarizeTransactions(transactions) {
    console.log("📥 Summarizing transactions...")
    try {
      const raw = await this.agents.transactionSummarizer.invoke({
        transactionData: JSON.stringify(transactions),
      })
      const result = await this.safeParse(raw, {
        summary: "No transactions to summarize",
        categories: {},
        total: 0,
        monthlyPattern: "No pattern available",
      })
      console.log("✅ Transaction summary complete")
      return result
    } catch (error) {
      console.error("❌ Transaction summarization failed:", error.message)
      return { summary: "Failed to summarize", categories: {}, total: 0 }
    }
  }
  async generateFakeChartData(
    userProfile,
    financialData = {},
    userQuery = "",
    chartType = "bar"
  ) {
    try {
      const modelResult = this.getAvailableModel()
      if (!modelResult) {
        console.log("⚠️ No AI model available, returning fallback chart data")
        return [
          { label: "Food & Dining", value: 450 },
          { label: "Transportation", value: 320 },
          { label: "Utilities", value: 180 },
          { label: "Entertainment", value: 150 },
          { label: "Shopping", value: 220 },
        ]
      }

      const { model } = modelResult

      const prompt = `
You are a Financial Data Generator AI. Based on the given user profile, financial data, and user query, generate plausible chart data for financial visualization.

User Profile: ${JSON.stringify(userProfile)}
Financial Data: ${JSON.stringify(financialData)}
User Query: "${userQuery}"
Chart Type: ${chartType}

Return ONLY a JSON array with NO Markdown fences of objects like:
[{"label": "Category", "value": 123.45}]
    `

      console.log("💡 Generating fallback chart data via Gemini...")
      const response = await model.invoke(prompt)
      const raw = response.content || response // depends on response structure
      const parsed = JSON.parse(raw)
      console.log(response)

      if (Array.isArray(parsed)) {
        console.log("✅ Generated fake chart data:", parsed)
        return parsed
      } else {
        console.warn(
          "⚠️ Gemini returned invalid data, falling back to empty array"
        )
        return []
      }
    } catch (err) {
      console.warn("❌ Gemini chart generation failed:", err.message)
      return []
    }
  }
  async analyzeSpending(userProfile, summarizedTransactions) {
    console.log("📊 Analyzing spending...")
    try {
      const raw = await this.agents.spendingAnalysis.invoke({
        profile: JSON.stringify(userProfile),
        summarizedTransactions: JSON.stringify(summarizedTransactions),
      })
      const result = await this.safeParse(raw, {
        insights: [],
        concerns: [],
        recommendations: [],
        potentialSavings: 0,
      })
      console.log("✅ Spending analysis complete")
      return result
    } catch (error) {
      console.error("❌ Spending analysis failed:", error.message)
      return { insights: [], concerns: [], recommendations: [] }
    }
  }

  async optimizeGoals(userProfile, goals, progress) {
    console.log("🎯 Optimizing goals...")
    try {
      const raw = await this.agents.goalOptimization.invoke({
        profile: JSON.stringify(userProfile),
        goals: JSON.stringify(goals),
        progress: JSON.stringify(progress),
      })
      const result = await this.safeParse(raw, {
        prioritized_goals: [],
        optimization_strategies: [],
        timeline_adjustments: {},
        advice: "No advice available",
      })
      console.log("✅ Goal optimization complete")
      return result
    } catch (error) {
      console.error("❌ Goal optimization failed:", error.message)
      return { prioritized_goals: [], optimization_strategies: [] }
    }
  }

  async generateBudgetPlan(userProfile, preferences = {}) {
    console.log("💰 Generating budget plan...")
    try {
      const raw = await this.agents.budgetPlanner.invoke({
        profile: JSON.stringify(userProfile),
        preferences: JSON.stringify(preferences),
      })
      const result = await this.safeParse(raw, {
        categories: {},
        budget_method: "default",
        recommendations: [],
      })
      console.log("✅ Budget plan generated")
      return result
    } catch (error) {
      console.error("❌ Budget planning failed:", error.message)
      return { categories: {}, budget_method: "default" }
    }
  }

  async selectChart(summarizedData, insights) {
    console.log("📈 Selecting chart...")
    try {
      const raw = await this.agents.chartSelector.invoke({
        summarizedData: JSON.stringify(summarizedData),
        insights: JSON.stringify(insights),
      })
      const result = await this.safeParse(raw, {
        type: "bar",
        description: "Financial overview chart",
        title: "Financial Summary",
      })
      console.log("✅ Chart selection complete")
      return result
    } catch (error) {
      console.error("❌ Chart selection failed:", error.message)
      return { type: "bar", description: "Chart unavailable" }
    }
  }

  async formatChartData(rawData) {
    console.log("🖌 Formatting chart data...")
    try {
      const raw = await this.agents.dataFormatter.invoke({
        rawData: JSON.stringify(rawData),
      })
      const result = await this.safeParse(raw, [])

      // ✅ Fixed: Ensure we always return array format
      if (!Array.isArray(result)) {
        // Convert categories object to array format
        if (rawData && rawData.categories) {
          return Object.entries(rawData.categories).map(([label, value]) => ({
            label,
            value: parseFloat(value) || 0,
          }))
        }
        return []
      }

      console.log("✅ Chart data formatted")
      return result
    } catch (error) {
      console.error("❌ Chart data formatting failed:", error.message)
      return []
    }
  }

  /**
   * ✅ NEW: Format real transaction data for charts
   */
  async formatRealTransactionData(transactions) {
    console.log(
      "📊 Formatting real transaction data for chart visualization..."
    )
    try {
      if (!transactions || transactions.length === 0) {
        console.log("No transactions to format")
        return []
      }

      // Group transactions by category for spending analysis
      const categoryTotals = {}
      let totalExpenses = 0

      transactions.forEach((transaction) => {
        // Only process expenses (negative amounts or expense type)
        if (transaction.type === "expense" || transaction.amount < 0) {
          const category = transaction.category?.primary || "other"
          const amount = Math.abs(transaction.amount)

          if (!categoryTotals[category]) {
            categoryTotals[category] = 0
          }
          categoryTotals[category] += amount
          totalExpenses += amount
        }
      })

      // Convert to chart data format and sort by amount
      const chartData = Object.entries(categoryTotals)
        .map(([category, amount]) => ({
          label: this.formatCategoryName(category),
          value: amount,
          percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10) // Top 10 categories

      console.log(
        `✅ Formatted ${chartData.length} spending categories from ${transactions.length} transactions`
      )
      return chartData
    } catch (error) {
      console.error(
        "❌ Real transaction data formatting failed:",
        error.message
      )
      return []
    }
  }

  /**
   * ✅ NEW: Format category names for display
   */
  formatCategoryName(category) {
    const categoryMap = {
      food: "Food & Dining",
      transportation: "Transportation",
      housing: "Housing",
      utilities: "Utilities",
      healthcare: "Healthcare",
      entertainment: "Entertainment",
      shopping: "Shopping",
      education: "Education",
      subscription: "Subscriptions",
      debt_payment: "Debt Payment",
      insurance: "Insurance",
      travel: "Travel",
      charity: "Charity",
      investment: "Investment",
      savings: "Savings",
      other: "Other",
    }
    return (
      categoryMap[category] ||
      category.charAt(0).toUpperCase() + category.slice(1)
    )
  }

  async generateFinancialAdvice(
    userProfile,
    financialData = {},
    userQuery = ""
  ) {
    const queryText =
      typeof userQuery === "string" ? userQuery : userQuery?.content || ""

    console.log("💬 Generating financial advice for query:", queryText)

    try {
      // ✅ NEW: Fetch real data from MongoDB
      let realFinancialData = financialData

      if (userProfile?.id) {
        console.log("📊 Fetching real user data from MongoDB...")
        try {
          const userData = await DatabaseService.getUserFinancialData(
            userProfile.id
          )
          realFinancialData = {
            ...financialData,
            ...userData,
            // Keep any passed-in data but prioritize real data
            recentTransactions:
              userData.recentTransactions ||
              financialData.recentTransactions ||
              [],
            currentGoals:
              userData.currentGoals || financialData.currentGoals || [],
            bets: userData.bets || financialData.bets || [],
            userProfile: userData.userProfile || userProfile,
          }
          console.log(
            `✅ Real data loaded: ${userData.recentTransactions.length} transactions, ${userData.currentGoals.length} goals`
          )
        } catch (dataError) {
          console.warn(
            "⚠️ Failed to fetch real data, using provided data:",
            dataError.message
          )
          realFinancialData = financialData
        }
      }

      const summarized = await this.summarizeTransactions(
        realFinancialData.recentTransactions || []
      )

      // ✅ Fixed: This was already correct but added error handling
      const relevantAgents = await this.getRelevantAgents(queryText)
      console.log(
        "📌 Agents selected based on query:",
        relevantAgents.join(", ")
      )

      let spendingInsights = {}
      let optimizedGoals = {}
      let budgetPlan = {}
      let chartRecommendation = {}
      let formattedChartData = []

      // ✅ Added: Parallel execution for better performance
      const promises = []

      if (relevantAgents.includes("spendingAnalysis")) {
        promises.push(this.analyzeSpending(userProfile, summarized))
      }
      if (relevantAgents.includes("goalOptimization")) {
        promises.push(
          this.optimizeGoals(
            userProfile,
            realFinancialData.currentGoals || [],
            realFinancialData.goalProgress || {}
          )
        )
      }
      if (relevantAgents.includes("budgetPlanner")) {
        promises.push(
          this.generateBudgetPlan(
            userProfile,
            realFinancialData.preferences || {}
          )
        )
      }

      // Execute relevant agents in parallel
      const results = await Promise.allSettled(promises)
      let resultIndex = 0

      if (relevantAgents.includes("spendingAnalysis")) {
        spendingInsights =
          results[resultIndex].status === "fulfilled"
            ? results[resultIndex].value
            : {}
        resultIndex++
      }
      if (relevantAgents.includes("goalOptimization")) {
        optimizedGoals =
          results[resultIndex].status === "fulfilled"
            ? results[resultIndex].value
            : {}
        resultIndex++
      }
      if (relevantAgents.includes("budgetPlanner")) {
        budgetPlan =
          results[resultIndex].status === "fulfilled"
            ? results[resultIndex].value
            : {}
      }

      // Chart generation with real data preference
      if (relevantAgents.includes("chartSelector")) {
        chartRecommendation = await this.selectChart(
          summarized,
          spendingInsights
        )

        // ✅ NEW: Try to get real chart data first
        if (
          realFinancialData.recentTransactions &&
          realFinancialData.recentTransactions.length > 0
        ) {
          formattedChartData = await this.formatRealTransactionData(
            realFinancialData.recentTransactions
          )
          console.log(
            "📊 Using real transaction data for chart:",
            formattedChartData.length,
            "data points"
          )
        } else {
          formattedChartData = await this.formatChartData(summarized)
        }

        // Fallback: Generate chart data via AI if none exists
        if (!formattedChartData || formattedChartData.length === 0) {
          console.log("🤖 Generating AI fallback chart data...")
          formattedChartData = await this.generateFakeChartData(
            userProfile,
            realFinancialData,
            userQuery,
            chartRecommendation.type
          )
        }
      }

      console.log("📌 Invoking FinancialAdvisor agent with all data...")

      const raw = await this.agents.financialAdvisor.invoke({
        profile: JSON.stringify(userProfile),
        summarizedTransactions: JSON.stringify(summarized),
        spendingInsights: JSON.stringify(spendingInsights),
        optimizedGoals: JSON.stringify(optimizedGoals),
        budgetPlan: JSON.stringify(budgetPlan),
        chartRecommendation: JSON.stringify(chartRecommendation),
        formattedChartData: JSON.stringify(formattedChartData),
        userQuery,
      })

      const result = await this.safeParse(raw, {
        response: "Could not generate advice",
        insights: [],
        suggestions: [],
        visualization: {},
        followUpQuestions: [],
      })

      console.log("✅ Financial advice generated")

      // Generate interactive chart data for frontend rendering
      if (
        chartRecommendation &&
        Array.isArray(formattedChartData) &&
        formattedChartData.length > 0
      ) {
        try {
          result.visualization = {
            type: chartRecommendation.type || "pie",
            title:
              chartRecommendation.title ||
              chartRecommendation.description ||
              "Financial Chart",
            data: {
              labels: formattedChartData.map((d) => d.label || "Unknown"),
              datasets: [
                {
                  label: "Amount (₹)",
                  data: formattedChartData.map((d) => parseFloat(d.value) || 0),
                  backgroundColor: [
                    "#3B82F6",
                    "#EF4444",
                    "#10B981",
                    "#F59E0B",
                    "#8B5CF6",
                    "#EC4899",
                    "#06B6D4",
                    "#84CC16",
                    "#F97316",
                    "#6366F1",
                  ],
                  borderColor: "#FFFFFF",
                  borderWidth: 2,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: "bottom",
                },
              },
            },
            recommended: true,
            dataSource:
              realFinancialData.recentTransactions &&
              realFinancialData.recentTransactions.length > 0
                ? "real"
                : "generated",
          }
          console.log(
            "📊 Chart data created from",
            result.visualization.dataSource,
            "data:",
            formattedChartData.length,
            "points"
          )

          // ✅ NEW: Save visualization to database if real data was used
          if (result.visualization.dataSource === "real" && userProfile?.id) {
            try {
              await DatabaseService.saveVisualization(userProfile.id, {
                title: result.visualization.title,
                description: chartRecommendation.description,
                type: result.visualization.type,
                data: result.visualization.data,
                prompt: queryText,
                insights: result.insights,
              })
              console.log("💾 Visualization saved to database")
            } catch (saveError) {
              console.warn(
                "⚠️ Failed to save visualization:",
                saveError.message
              )
            }
          }
        } catch (err) {
          console.warn("Chart data preparation failed:", err.message)
        }
      } else {
        console.log("No chart data available:", {
          chartRecommendation,
          formattedChartData,
        })
      }
      return result
    } catch (error) {
      console.error("❌ Financial advice generation failed:", error.message)
      return {
        response:
          "Sorry, I encountered an error generating advice. Please try again.",
        insights: [],
        suggestions: [],
        visualization: {},
        followUpQuestions: [],
      }
    }
  }

  async generateLifePathProjection(userData, timeRange = "40y") {
    try {
      const modelResult = this.getAvailableModel()
      if (!modelResult) {
        console.log(
          "⚠️ No AI model available, returning fallback life path projection"
        )
        return this.generateFallbackLifePathProjection(userData)
      }

      const { model, provider } = modelResult

      console.log(
        `🤖 Generating life path projection with ${provider} (Gemini 2.5 Flash)...`
      )

      const promptTemplate = PromptTemplate.fromTemplate(`
        You are a financial planner. Create TWO net worth projections: current path vs optimized path.
        
        USER: Age {currentAge}, Income {monthlyIncome}/month, Savings {currentSavings}, Risk {riskTolerance}
        
        Create yearly projections from age {currentAge} to {retirementAge}.
        Current path: based on current savings rate
        Optimized path: with improved savings/investment strategy
        
        Format as JSON:
        {{
          "currentPath": [
            {{"age": 25, "year": 2025, "netWorth": 50000}}
          ],
          "optimizedPath": [
            {{"age": 25, "year": 2025, "netWorth": 55000}}
          ],
          "assumptions": {{
            "currentSavingsRate": 10,
            "optimizedSavingsRate": 20,
            "annualReturn": 7
          }},
          "optimizations": ["Increase 401k", "Reduce expenses", "Side income"]
        }}
        
        Make optimized path 20-30% better than current path.
      `)

      const chain = RunnableSequence.from([
        promptTemplate,
        model,
        new StringOutputParser(),
      ])

      const result = await chain.invoke({
        currentAge: userData?.currentAge || userData?.age || 25,
        retirementAge: userData?.retirementAge || 65,
        lifeStage:
          userData?.onboarding?.lifeStage ||
          userData?.lifeStage ||
          "Early Career",
        riskTolerance:
          userData?.onboarding?.riskTolerance ||
          userData?.riskTolerance ||
          "moderate",
        monthlyIncome:
          userData?.financialProfile?.monthlyIncome ||
          userData?.monthlyIncome ||
          5000,
        monthlyExpenses:
          userData?.financialProfile?.monthlyExpenses ||
          userData?.monthlyExpenses ||
          3500,
        currentSavings:
          userData?.financialProfile?.currentSavings ||
          userData?.currentSavings ||
          15000,
        debt: userData?.financialProfile?.debt || userData?.debt || 0,
        netWorth:
          (userData?.financialProfile?.currentSavings ||
            userData?.currentSavings ||
            15000) - (userData?.financialProfile?.debt || userData?.debt || 0),
        primaryGoals:
          userData?.onboarding?.primaryGoals?.join(", ") ||
          userData?.goals?.map((g) => g?.title).join(", ") ||
          "Financial independence",
        recentActivity: JSON.stringify({
          hasTransactions: !!(
            userData?.transactions && userData.transactions.length > 0
          ),
          recentGoals: userData?.goals?.slice(0, 3) || [],
          spendingPatterns: userData?.spendingPatterns || [],
        }),
      })

      console.log("✅ Gemini 2.5 Flash life path response received, parsing...")

      try {
        // Clean the result string before parsing (same as generateFinancialAdvice)
        let cleanResult = result.trim()

        // Remove any markdown code blocks if present
        if (cleanResult.startsWith("```json")) {
          cleanResult = cleanResult
            .replace(/^```json\s*/, "")
            .replace(/\s*```$/, "")
        } else if (cleanResult.startsWith("```")) {
          cleanResult = cleanResult
            .replace(/^```\s*/, "")
            .replace(/\s*```$/, "")
        }

        const parsedResult = JSON.parse(cleanResult)
        console.log(
          `✅ Gemini life path projection generated: ${
            parsedResult.projection?.length || 0
          } data points`
        )

        return {
          ...parsedResult,
          provider: provider,
          model: "gemini-2.5-flash",
          timestamp: new Date(),
        }
      } catch (parseError) {
        console.warn(
          "JSON parsing failed for life path projection, attempting to extract:",
          parseError.message
        )

        // Try to extract JSON from the response if it's embedded in text (same as generateFinancialAdvice)
        const jsonMatch = result.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            const parsedResult = JSON.parse(jsonMatch[0])
            return {
              ...parsedResult,
              provider: provider,
              model: "gemini-2.5-flash",
              timestamp: new Date(),
            }
          } catch (secondParseError) {
            console.warn(
              "Second JSON parse attempt failed for life path:",
              secondParseError.message
            )
          }
        }

        // Final fallback if JSON parsing completely fails
        throw new Error(
          "Unable to parse life path projection from Gemini response"
        )
      }
    } catch (error) {
      console.error("Life path projection error:", error.message)

      // Check for rate limiting
      if (
        error.message?.includes("quota") ||
        error.message?.includes("rate") ||
        error.message?.includes("limit")
      ) {
        console.log("🚨 Gemini API rate limit detected, will use fallback")
        throw new Error("RATE_LIMITED")
      }

      throw new Error(
        `Failed to generate life path projection: ${error.message}`
      )
    }
  }

  async calculateLifeEventImpact(
    userData,
    baselineProjection,
    lifeEvent,
    eventAge,
    currentAge
  ) {
    try {
      const modelResult = this.getAvailableModel()
      if (!modelResult) {
        console.log(
          "⚠️ No AI model available, returning fallback life event impact"
        )
        return this.generateFallbackLifeEventImpact(lifeEvent, eventAge)
      }

      const { model, provider } = modelResult

      const promptTemplate = PromptTemplate.fromTemplate(`
        You are a financial impact analysis expert. Calculate how a specific life event will change a person's financial trajectory.
        
        USER DATA:
        - Current Age: {currentAge}
        - Monthly Income: {monthlyIncome}
        - Monthly Expenses: {monthlyExpenses}
        - Current Savings: {currentSavings}
        - Risk Tolerance: {riskTolerance}
        
        BASELINE PROJECTION:
        {baselineProjection}
        
        LIFE EVENT:
        Event: {lifeEvent}
        Age when event occurs: {eventAge}
        
        Analyze this life event and calculate:
        1. Immediate financial impact (costs, income changes)
        2. Short-term effects (1-5 years)
        3. Long-term consequences (5+ years)
        4. Net lifetime impact on wealth
        
        Use real statistical data about life events. Common examples:
        - Education (MBA, grad school): Average costs and income boost
        - Home purchase: Down payment, mortgage, equity building, tax benefits
        - Retirement accounts: Tax benefits, compound growth
        - Children: Average costs per year, education expenses
        - Career changes: Income impact, benefits changes
        - Business ventures: Startup costs, failure/success rates
        
        Format as JSON:
        {{
          "alternativeProjection": [
            {{
              "age": number,
              "year": number,
              "netWorth": number
            }}
          ],
          "impact_analysis": {{
            "immediate_cost": number,
            "annual_ongoing_cost": number,
            "income_change": number,
            "long_term_benefit": number,
            "net_lifetime_impact": number
          }},
          "eventSources": [
            "Statistical source for this type of event",
            "Research data used in calculations"
          ],
          "risk_factors": [
            "Potential risks or variables that could affect outcomes"
          ]
        }}
        
        Be specific with calculations and cite real statistics where possible.
      `)

      const chain = RunnableSequence.from([
        promptTemplate,
        model,
        new StringOutputParser(),
      ])

      const result = await chain.invoke({
        currentAge: currentAge,
        monthlyIncome:
          userData.financialProfile?.monthlyIncome ||
          userData.monthlyIncome ||
          0,
        monthlyExpenses:
          userData.financialProfile?.monthlyExpenses ||
          userData.monthlyExpenses ||
          0,
        currentSavings:
          userData.financialProfile?.currentSavings ||
          userData.currentSavings ||
          0,
        riskTolerance:
          userData.onboarding?.riskTolerance ||
          userData.riskTolerance ||
          "moderate",
        baselineProjection: JSON.stringify(baselineProjection.slice(0, 10)), // Send sample for context
        lifeEvent: lifeEvent,
        eventAge: eventAge,
      })

      try {
        let cleanResult = result.trim()
        if (cleanResult.startsWith("```json")) {
          cleanResult = cleanResult
            .replace(/^```json\s*/, "")
            .replace(/\s*```$/, "")
        }
        return JSON.parse(cleanResult)
      } catch (parseError) {
        console.warn(
          "Failed to parse life event impact JSON:",
          parseError.message
        )
        throw new Error("Invalid response format from AI model")
      }
    } catch (error) {
      console.error("Life event impact calculation error:", error)
      throw new Error(`Failed to calculate life event impact: ${error.message}`)
    }
  }

  generateFallbackLifePathProjection(userData) {
    const currentAge = userData?.currentAge || userData?.age || 25
    const retirementAge = userData?.retirementAge || 65
    const currentSavings =
      userData?.financialProfile?.currentSavings ||
      userData?.currentSavings ||
      15000
    const monthlyIncome =
      userData?.financialProfile?.monthlyIncome ||
      userData?.monthlyIncome ||
      5000
    const monthlyExpenses =
      userData?.financialProfile?.monthlyExpenses ||
      userData?.monthlyExpenses ||
      3500

    const monthlySavings = monthlyIncome - monthlyExpenses
    const annualSavings = monthlySavings * 12
    const annualReturn = 0.07 // 7% average return

    const currentPath = []
    const optimizedPath = []

    let currentNetWorth = currentSavings
    let optimizedNetWorth = currentSavings

    for (let age = currentAge; age <= retirementAge; age++) {
      const year = new Date().getFullYear() + (age - currentAge)

      // Current path: modest growth
      currentNetWorth = (currentNetWorth + annualSavings) * (1 + annualReturn)
      currentPath.push({ age, year, netWorth: Math.round(currentNetWorth) })

      // Optimized path: 20% better savings rate
      const optimizedAnnualSavings = annualSavings * 1.2
      optimizedNetWorth =
        (optimizedNetWorth + optimizedAnnualSavings) * (1 + annualReturn * 1.1)
      optimizedPath.push({ age, year, netWorth: Math.round(optimizedNetWorth) })
    }

    return {
      currentPath,
      optimizedPath,
      assumptions: {
        currentSavingsRate: Math.round((monthlySavings / monthlyIncome) * 100),
        optimizedSavingsRate: Math.round(
          ((monthlySavings * 1.2) / monthlyIncome) * 100
        ),
        annualReturn: 7,
      },
      optimizations: [
        "Increase 401(k) contributions",
        "Reduce discretionary expenses",
        "Consider side income opportunities",
      ],
      provider: "fallback",
      model: "mathematical-projection",
      timestamp: new Date(),
    }
  }

  generateFallbackLifeEventImpact(lifeEvent, eventAge) {
    // Basic impact estimates for common life events
    const impactMap = {
      education: {
        immediate_cost: -50000,
        annual_ongoing_cost: 0,
        income_change: 15000,
        long_term_benefit: 300000,
        net_lifetime_impact: 250000,
      },
      home_purchase: {
        immediate_cost: -60000,
        annual_ongoing_cost: -2000,
        income_change: 0,
        long_term_benefit: 200000,
        net_lifetime_impact: 140000,
      },
      children: {
        immediate_cost: -15000,
        annual_ongoing_cost: -12000,
        income_change: 0,
        long_term_benefit: 0,
        net_lifetime_impact: -250000,
      },
      business: {
        immediate_cost: -25000,
        annual_ongoing_cost: -5000,
        income_change: 20000,
        long_term_benefit: 500000,
        net_lifetime_impact: 400000,
      },
      default: {
        immediate_cost: -10000,
        annual_ongoing_cost: -1000,
        income_change: 0,
        long_term_benefit: 0,
        net_lifetime_impact: -20000,
      },
    }

    const impact = impactMap[lifeEvent.toLowerCase()] || impactMap["default"]

    return {
      alternativeProjection: [],
      impact_analysis: impact,
      eventSources: [
        "Fallback mathematical estimates",
        "Basic statistical averages",
      ],
      risk_factors: [
        "Estimates may vary significantly based on individual circumstances",
        "Market conditions and personal choices affect outcomes",
      ],
    }
  }
}

module.exports = new AIFinancialAdvisor()
