// server/middleware/checkAdmin.js
module.exports = function checkAdmin(req, res, next) {
  try {
    const roles = req.auth?.['https://jesko.com/roles'] || []

    if (!roles.includes('admin')) {
      return res.status(403).json({ error: "Admin access required" })
    }

    next()
  } catch (err) {
    console.error("Admin check error:", err)
    return res.status(403).json({ error: "Forbidden" })
  }
}
