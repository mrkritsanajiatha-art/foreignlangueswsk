import { db } from './firebase.js'
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, query, where, orderBy, writeBatch, increment
} from 'firebase/firestore'

const state = {
  teachers: [],
  days: [],
  currentResult: null,
  stats: {},
  captureFile: null
}

const els = {
  loading: document.getElementById('loading'),
  tabBtnDashboard: document.getElementById('tabBtnDashboard'),
  tabBtnManage: document.getElementById('tabBtnManage'),
  tabDashboard: document.getElementById('tabDashboard'),
  tabManage: document.getElementById('tabManage'),
  loginSection: document.getElementById('loginSection'),
  workspaceSection: document.getElementById('workspaceSection'),
  loginUsername: document.getElementById('loginUsername'),
  loginPassword: document.getElementById('loginPassword'),
  btnLogin: document.getElementById('btnLogin'),
  btnLogout: document.getElementById('btnLogout'),
  dashboardTop: document.getElementById('dashboardTop'),
  dashboardTableBody: document.getElementById('dashboardTableBody'),
  loadingText: document.getElementById('loadingText'),
  absentTeacher: document.getElementById('absentTeacher'),
  leaveDay: document.getElementById('leaveDay'),
  leaveDate: document.getElementById('leaveDate'),
  leaveType: document.getElementById('leaveType'),
  leaveTypeOther: document.getElementById('leaveTypeOther'),
  leaveTypeOtherWrap: document.getElementById('leaveTypeOtherWrap'),
  searchBtn: document.getElementById('searchBtn'),
  saveBtn: document.getElementById('saveBtn'),
  captureBtn: document.getElementById('captureBtn'),
  teacherCount: document.getElementById('teacherCount'),
  periodCount: document.getElementById('periodCount'),
  messageBox: document.getElementById('messageBox'),
  resultArea: document.getElementById('resultArea'),
  assignmentList: document.getElementById('assignmentList'),
  summaryTeacher: document.getElementById('summaryTeacher'),
  summaryLeaveType: document.getElementById('summaryLeaveType'),
  summaryDay: document.getElementById('summaryDay'),
  summaryDate: document.getElementById('summaryDate'),
  captureContent: document.getElementById('captureContent'),
  captureTimestamp: document.getElementById('captureTimestamp'),
  captureArea: document.getElementById('captureArea'),
  imageModal: document.getElementById('imageModal'),
  capturedImg: document.getElementById('capturedImg'),
  capturedDownload: document.getElementById('capturedDownload'),
  btnCloseModal: document.getElementById('btnCloseModal'),
  btnCloseModal2: document.getElementById('btnCloseModal2'),
  btnShareImg: document.getElementById('btnShareImg')
}

init()
els.searchBtn.addEventListener('click', handleSearch)
els.saveBtn.addEventListener('click', handleSave)
els.captureBtn.addEventListener('click', handleCapture)
els.absentTeacher.addEventListener('change', updateSummaryFromInputs)
els.leaveDay.addEventListener('change', updateSummaryFromInputs)
els.leaveDate.addEventListener('change', updateSummaryFromInputs)
els.leaveType.addEventListener('change', function () {
  els.leaveTypeOtherWrap.style.display = els.leaveType.value === 'อื่นๆ' ? '' : 'none'
  updateSummaryFromInputs()
})
els.leaveTypeOther.addEventListener('input', updateSummaryFromInputs)
els.tabBtnDashboard.addEventListener('click', function () { switchTab('dashboard') })
els.tabBtnManage.addEventListener('click', function () { switchTab('manage') })
els.btnLogin.addEventListener('click', handleLogin)
els.btnLogout.addEventListener('click', handleLogout)
els.btnCloseModal.addEventListener('click', closeImageModal)
els.btnCloseModal2.addEventListener('click', closeImageModal)
els.btnShareImg.addEventListener('click', shareImage)
els.imageModal.addEventListener('click', function (e) { if (e.target === els.imageModal) closeImageModal() })

// ซ่อนปุ่มแชร์บนเบราว์เซอร์ที่ไม่รองรับ Web Share API (เช่น Chrome บน PC)
if (!(navigator.share && navigator.canShare)) {
  document.body.classList.add('no-share')
}
window.addEventListener('resize', scaleCapturePreview)

function switchTab(tab) {
  if (tab === 'dashboard') {
    els.tabBtnDashboard.classList.add('active')
    els.tabBtnManage.classList.remove('active')
    els.tabDashboard.classList.add('active')
    els.tabManage.classList.remove('active')
  } else {
    els.tabBtnDashboard.classList.remove('active')
    els.tabBtnManage.classList.add('active')
    els.tabDashboard.classList.remove('active')
    els.tabManage.classList.add('active')
    checkLoginState()
  }
}

function checkLoginState() {
  if (sessionStorage.getItem('isAdmin') === 'true') {
    els.loginSection.style.display = 'none'
    els.workspaceSection.style.display = ''
    scaleCapturePreview()
  } else {
    els.loginSection.style.display = 'block'
    els.workspaceSection.style.display = 'none'
  }
}

function handleLogin() {
  if (els.loginUsername.value === 'foreign1/2569' && els.loginPassword.value === 'foreign1/2569') {
    sessionStorage.setItem('isAdmin', 'true')
    els.loginUsername.value = ''
    els.loginPassword.value = ''
    checkLoginState()
  } else {
    alert('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
  }
}

function handleLogout() {
  sessionStorage.removeItem('isAdmin')
  checkLoginState()
  switchTab('dashboard')
}

function renderDashboard() {
  if (!state.stats) return
  const statsArr = Object.keys(state.stats).map(function (name) {
    return {
      name: name,
      leaveCount: state.stats[name].leaveCount || 0,
      substituteCount: state.stats[name].substituteCount || 0
    }
  })
  statsArr.sort(function (a, b) { return b.substituteCount - a.substituteCount })

  const top3 = statsArr.slice(0, 3)
  const classes = ['gold', 'silver', 'bronze']
  const titles = ['อันดับ 1', 'อันดับ 2', 'อันดับ 3']

  let topHtml = ''
  top3.forEach(function (item, idx) {
    if (item.substituteCount > 0) {
      topHtml += '<div class="stat-card ' + classes[idx] + '"><div class="eyebrow">' + titles[idx] + '</div><div class="stat-label">' + item.name + '</div><div class="stat-value">' + item.substituteCount + '</div><div class="stat-label">คาบ</div></div>'
    }
  })
  if (!topHtml) topHtml = '<div class="empty-card" style="grid-column: 1/-1;">ยังไม่มีข้อมูลการสอนแทน</div>'
  els.dashboardTop.innerHTML = topHtml

  let tableHtml = ''
  statsArr.forEach(function (item) {
    tableHtml += '<tr><td><strong>' + item.name + '</strong></td><td class="text-danger-custom">' + item.leaveCount + '</td><td class="text-success-custom">' + item.substituteCount + '</td></tr>'
  })
  els.dashboardTableBody.innerHTML = tableHtml
}

async function init() {
  setDefaultDate()
  setLoading(true, 'กำลังโหลดฐานข้อมูล')
  try {
    const data = await getInitialData()
    state.teachers = data.teachers || []
    state.days = data.days || []
    state.stats = data.stats || {}
    renderInitialOptions()
    renderDashboard()
    setMessage('เลือกรายชื่อครูและวันที่ต้องการจัดสอนแทน', 'info')
    setLoading(false)
  } catch (err) {
    handleFailure(err)
  }
}

function setDefaultDate() {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  els.leaveDate.value = yyyy + '-' + mm + '-' + dd
}

function renderInitialOptions() {
  fillSelect(els.absentTeacher, state.teachers, 'เลือกชื่อครูที่ลา')
  fillSelect(els.leaveDay, state.days, 'เลือกวันจันทร์-ศุกร์')
  els.teacherCount.textContent = state.teachers.length + ' คน'
  updateSummaryFromInputs()
}

function fillSelect(selectEl, items, placeholder) {
  selectEl.innerHTML = ''
  const first = document.createElement('option')
  first.value = ''
  first.textContent = placeholder
  selectEl.appendChild(first)
  items.forEach(function (item) {
    const option = document.createElement('option')
    option.value = item
    option.textContent = item
    selectEl.appendChild(option)
  })
}

async function handleSearch() {
  const absentTeacher = els.absentTeacher.value
  const day = els.leaveDay.value
  if (!absentTeacher || !day) {
    setMessage('กรุณาเลือกชื่อครูที่ลาและวันลาให้ครบถ้วน', 'error')
    return
  }
  setLoading(true, 'กำลังค้นหาครูที่ว่าง')
  try {
    const result = await findSubstituteTeachers(absentTeacher, day)
    state.currentResult = result
    renderAssignments(result)
    updateSummaryFromInputs()
    setLoading(false)
    setMessage(result.message || 'พบรายการคาบเรียนและครูที่ว่างแล้ว', result.rows.length ? 'success' : 'info')
  } catch (err) {
    handleFailure(err)
  }
}

async function handleReset() {
  if (!confirm('ยืนยันการล้างสถิติและประวัติการสอนแทนทั้งหมด?\n(การกระทำนี้ไม่สามารถย้อนกลับได้)')) return
  setLoading(true, 'กำลังล้างข้อมูล...')
  try {
    const [subsSnap, teachersSnap] = await Promise.all([
      getDocs(collection(db, 'substitutions')),
      getDocs(collection(db, 'teachers'))
    ])
    const batch = writeBatch(db)
    subsSnap.docs.forEach(d => batch.delete(d.ref))
    teachersSnap.docs.forEach(d => batch.update(d.ref, { leave_count: 0, substitute_count: 0 }))
    await batch.commit()

    const data = await getInitialData()
    state.stats = data.stats || {}
    renderDashboard()

    els.absentTeacher.value = ''
    els.leaveDay.value = ''
    els.leaveDate.value = ''
    els.leaveType.value = ''
    els.leaveTypeOther.value = ''
    els.leaveTypeOtherWrap.style.display = 'none'
    els.assignmentList.innerHTML = ''
    els.resultArea.style.display = 'none'
    els.saveBtn.disabled = true
    els.captureBtn.disabled = true
    updateSummaryFromInputs()
    setLoading(false)
    setMessage('ล้างข้อมูลสถิติและการสอนแทนทั้งหมดเรียบร้อยแล้ว', 'success')
  } catch (err) {
    handleFailure(err)
  }
}

function renderAssignments(result) {
  els.assignmentList.innerHTML = ''
  els.resultArea.style.display = result.rows.length ? 'block' : 'none'
  els.captureBtn.disabled = !result.rows.length
  els.saveBtn.disabled = !result.rows.length
  els.periodCount.textContent = result.rows.length + ' คาบ'

  if (!result.rows.length) {
    renderCaptureTable([])
    return
  }

  result.rows.forEach(function (row) {
    const wrapper = document.createElement('div')
    wrapper.className = 'assignment-row'
    wrapper.dataset.period = row.period

    const badge = document.createElement('div')
    badge.className = 'period-badge'
    badge.textContent = row.period

    const fieldWrap = document.createElement('div')
    const lessonDetail = document.createElement('p')
    lessonDetail.className = 'lesson-detail'
    lessonDetail.innerHTML = formatLessonDetail(row.lesson)

    const select = document.createElement('select')
    select.className = 'field substitute-select'
    select.dataset.period = row.period

    const placeholder = document.createElement('option')
    placeholder.value = ''
    placeholder.textContent = row.availableTeachers.length ? 'เลือกครูผู้สอนแทน' : 'ไม่พบครูที่ว่าง'
    select.appendChild(placeholder)
    select.disabled = !row.availableTeachers.length

    row.availableTeachers.forEach(function (teacher) {
      const option = document.createElement('option')
      option.value = teacher.name
      option.textContent = teacher.name
        + ' (มีสอนวันนี้ ' + teacher.dailyTeachingCount
        + ' คาบ, สอนแทนสะสม ' + teacher.substituteCount + ' ครั้ง)'
      select.appendChild(option)
    })

    select.addEventListener('change', updateCaptureFromSelections)

    const note = document.createElement('p')
    note.className = 'teacher-option-note'
    note.textContent = row.availableTeachers.length
      ? 'รายชื่อเรียงจากจำนวนคาบสอนในวันนั้นน้อยไปมาก แล้วตามด้วยจำนวนสอนแทนสะสม'
      : 'คาบนี้ไม่มีครูว่างตามเงื่อนไขไม่มีสอน ไม่มีเวร และไม่ติดนิเทศ'

    fieldWrap.appendChild(lessonDetail)
    fieldWrap.appendChild(select)
    fieldWrap.appendChild(note)
    wrapper.appendChild(badge)
    wrapper.appendChild(fieldWrap)
    els.assignmentList.appendChild(wrapper)
  })

  updateCaptureFromSelections()
}

async function handleSave() {
  if (!state.currentResult || !state.currentResult.rows.length) {
    setMessage('ยังไม่มีรายการสำหรับบันทึก', 'error')
    return
  }

  const assignments = getAssignments()
  const missing = state.currentResult.rows.filter(function (row) {
    return !assignments.some(function (item) { return item.period === row.period })
  })

  if (missing.length) {
    setMessage('กรุณาเลือกครูผู้สอนแทนให้ครบทุกคาบ', 'error')
    return
  }

  const lines = assignments.map(function (a) { return '• ' + a.period + ' → ' + a.substituteTeacher }).join('\n')
  const leaveType = getLeaveType()
  if (!confirm('ยืนยันการบันทึกและอัปเดตสถิติ?\n\nครูที่ลา: ' + els.absentTeacher.value + '\nประเภทการลา: ' + (leaveType || '-') + '\nวัน: ' + els.leaveDay.value + '\n\n' + lines)) return

  setLoading(true, 'กำลังบันทึกสถิติ')
  try {
    const response = await saveAssignments({
      absentTeacher: els.absentTeacher.value,
      day: els.leaveDay.value,
      leaveDate: els.leaveDate.value,
      leaveType: leaveType,
      assignments: assignments
    })
    state.stats = response.stats || state.stats
    setLoading(false)
    setMessage(response.message || 'บันทึกเรียบร้อยแล้ว', 'success')
    updateCaptureFromSelections()
    renderDashboard()
  } catch (err) {
    handleFailure(err)
  }
}

function getAssignments() {
  return Array.from(document.querySelectorAll('.substitute-select'))
    .map(function (select) {
      return { period: select.dataset.period, substituteTeacher: select.value }
    })
    .filter(function (item) { return item.substituteTeacher })
}

function getLeaveType() {
  if (els.leaveType.value === 'อื่นๆ') return els.leaveTypeOther.value.trim()
  return els.leaveType.value
}

function updateSummaryFromInputs() {
  els.summaryTeacher.textContent = els.absentTeacher.value || '-'
  els.summaryLeaveType.textContent = getLeaveType() || '-'
  els.summaryDay.textContent = els.leaveDay.value || '-'
  els.summaryDate.textContent = formatThaiDate(els.leaveDate.value) || '-'
  els.captureTimestamp.textContent = 'จัดทำเมื่อ ' + formatDateTime(new Date())
}

function updateCaptureFromSelections() {
  updateSummaryFromInputs()
  renderCaptureTable(getAssignments())
}

function renderCaptureTable(assignments) {
  if (!state.currentResult || !state.currentResult.rows.length) {
    els.captureContent.innerHTML = '<div class="empty-card">เลือกครูที่ลาและวันลา แล้วกดค้นหาครูสอนแทน</div>'
    return
  }

  const selectedMap = assignments.reduce(function (map, item) {
    map[item.period] = item.substituteTeacher
    return map
  }, {})

  const rowsHtml = state.currentResult.rows.map(function (row) {
    const teacher = selectedMap[row.period] || 'รอเลือกครูผู้ปฏิบัติหน้าที่แทน'
    return '<tr><td>' + escapeHtml(row.period) + '</td><td>' + escapeHtml(getLessonLabel(row.lesson)) + '</td><td>' + escapeHtml(teacher) + '</td></tr>'
  }).join('')

  els.captureContent.innerHTML =
    '<table class="capture-table">' +
    '<thead><tr><th>คาบเรียน</th><th>รายละเอียดคาบ</th><th>ครูผู้ปฏิบัติหน้าที่แทน</th></tr></thead>' +
    '<tbody>' + rowsHtml + '</tbody>' +
    '</table>'

  scaleCapturePreview()
}

function handleCapture() {
  updateCaptureFromSelections()
  setLoading(true, 'กำลังสร้างรูปภาพ')

  const savedZoom = els.captureArea.style.zoom
  els.captureArea.style.zoom = ''

  html2canvas(els.captureArea, {
    backgroundColor: '#ffffff',
    scale: Math.max(2, window.devicePixelRatio || 1),
    useCORS: true
  }).then(function (canvas) {
    els.captureArea.style.zoom = savedZoom

    const dataUrl = canvas.toDataURL('image/png', 1.0)
    const teacherName = (els.absentTeacher.value || 'summary').replace(/[\\/:*?"<>|]/g, '')
    const filename = 'บันทึกสอนแทน-' + teacherName + '-' + (els.leaveDate.value || 'date') + '.png'

    els.capturedImg.src = dataUrl
    els.capturedDownload.href = dataUrl
    els.capturedDownload.download = filename
    els.imageModal.classList.add('open')

    // เตรียมไฟล์รูปสำหรับปุ่มแชร์ (Web Share API → บันทึกลงคลังภาพ/ส่ง LINE)
    state.captureFile = null
    canvas.toBlob(function (blob) {
      if (blob) state.captureFile = new File([blob], filename, { type: 'image/png' })
    }, 'image/png', 1.0)

    setLoading(false)
    setMessage('สร้างรูปเรียบร้อย — เลือกวิธีบันทึกที่หน้าต่างพรีวิว', 'success')
  }).catch(function (error) {
    els.captureArea.style.zoom = savedZoom
    setLoading(false)
    setMessage(error.message || 'ไม่สามารถสร้างรูปภาพได้', 'error')
  })
}

function shareImage() {
  const file = state.captureFile
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({
      files: [file],
      title: 'บันทึกการปฏิบัติหน้าที่สอนแทน',
      text: 'บันทึกการปฏิบัติหน้าที่สอนแทน - กลุ่มสาระภาษาต่างประเทศ'
    }).catch(function () {
      // ผู้ใช้กดยกเลิก share sheet — ไม่ต้องทำอะไร
    })
  } else {
    // เบราว์เซอร์ไม่รองรับการแชร์ไฟล์ → ดาวน์โหลดแทน
    els.capturedDownload.click()
  }
}

function closeImageModal() {
  els.imageModal.classList.remove('open')
  els.capturedImg.src = ''
  state.captureFile = null
}

function scaleCapturePreview() {
  const card = els.captureArea.parentElement
  const cardWidth = card.offsetWidth
  if (cardWidth > 0 && cardWidth < 800) {
    els.captureArea.style.zoom = String(cardWidth / 800)
  } else {
    els.captureArea.style.zoom = ''
  }
}

function setLoading(isLoading, text) {
  els.loading.style.display = isLoading ? 'grid' : 'none'
  els.loadingText.textContent = text || 'กำลังประมวลผล'
  els.searchBtn.disabled = isLoading
  els.saveBtn.disabled = isLoading
  els.captureBtn.disabled = isLoading || !state.currentResult || !state.currentResult.rows.length
}

function setMessage(text, type) {
  els.messageBox.textContent = text
  els.messageBox.className = 'alert ' + (type || 'info')
}

function handleFailure(error) {
  setLoading(false)
  setMessage(error && error.message ? error.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง', 'error')
}

function formatLessonDetail(lesson) {
  if (!lesson || !lesson.course) {
    return '<span>รายละเอียดคาบ:</span> ไม่มีรายละเอียดห้องเรียน'
  }
  return '<span>รายละเอียดคาบ:</span> '
    + escapeHtml(lesson.course)
    + ' | ห้อง '
    + escapeHtml(lesson.className)
    + ' | ห้องเรียน '
    + escapeHtml(lesson.room)
}

function getLessonLabel(lesson) {
  if (!lesson || !lesson.course) return 'ไม่มีรายละเอียดห้องเรียน'
  return lesson.course + ' | ห้อง ' + lesson.className + ' | ห้องเรียน ' + lesson.room
}

// ─── Firebase DB functions ────────────────────────────────────────────────────

async function getInitialData() {
  const snap = await getDocs(query(collection(db, 'teachers'), orderBy('name')))
  const teachers = []
  const stats = {}
  snap.forEach(d => {
    const t = d.data()
    teachers.push(t.name)
    stats[t.name] = { leaveCount: t.leave_count || 0, substituteCount: t.substitute_count || 0 }
  })
  const days = ['วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์']
  return { teachers, days, stats }
}

async function findSubstituteTeachers(absentTeacher, day) {
  const [absentSnap, allTeachersSnap, daySchedulesSnap, dayDutiesSnap, daySupervisionsSnap] = await Promise.all([
    getDocs(query(
      collection(db, 'schedules'),
      where('teacher_name', '==', absentTeacher),
      where('day_of_week', '==', day)
    )),
    getDocs(collection(db, 'teachers')),
    getDocs(query(collection(db, 'schedules'), where('day_of_week', '==', day))),
    getDocs(query(collection(db, 'duties'), where('day_of_week', '==', day))),
    getDocs(query(collection(db, 'supervisions'), where('day_of_week', '==', day)))
  ])

  const absentPeriodsData = absentSnap.docs.map(d => d.data())
  if (!absentPeriodsData.length) {
    return { absentTeacher, day, periods: [], rows: [], message: 'ครูท่านนี้ไม่มีคาบสอนในวันที่เลือก' }
  }

  const allTeachers = allTeachersSnap.docs.map(d => d.data())
  const allSchedules = daySchedulesSnap.docs.map(d => d.data())
  const allDuties = dayDutiesSnap.docs.map(d => d.data())
  const allSupervisions = daySupervisionsSnap.docs.map(d => d.data())

  const absentPeriods = absentPeriodsData.map(p => p.period).sort((a, b) => {
    const numA = parseInt(a.replace('คาบ ', '')) || 0
    const numB = parseInt(b.replace('คาบ ', '')) || 0
    return numA - numB
  })

  const rows = []
  for (const periodObj of absentPeriodsData) {
    const period = periodObj.period

    const availableTeachers = allTeachers
      .filter(t => t.name !== absentTeacher)
      .filter(t => {
        const hasSchedule = allSchedules.some(s => s.teacher_name === t.name && s.period === period)
        const hasDuty = allDuties.some(d => d.teacher_name === t.name && d.period === period)
        const hasSupervision = allSupervisions.some(s => s.teacher_name === t.name && s.period === period)
        return !hasSchedule && !hasDuty && !hasSupervision
      })
      .map(t => {
        const dailyTeachingCount = allSchedules.filter(s => s.teacher_name === t.name).length
        return {
          name: t.name,
          dailyTeachingCount,
          leaveCount: t.leave_count || 0,
          substituteCount: t.substitute_count || 0
        }
      })
      .sort((a, b) => {
        if (a.dailyTeachingCount !== b.dailyTeachingCount) return a.dailyTeachingCount - b.dailyTeachingCount
        if (a.substituteCount !== b.substituteCount) return a.substituteCount - b.substituteCount
        return a.name.localeCompare(b.name, 'th')
      })

    rows.push({
      period,
      lesson: {
        course: periodObj.course,
        className: periodObj.class_name,
        room: periodObj.room
      },
      availableTeachers
    })
  }

  rows.sort((a, b) => {
    const numA = parseInt(a.period.replace('คาบ ', '')) || 0
    const numB = parseInt(b.period.replace('คาบ ', '')) || 0
    return numA - numB
  })

  return {
    absentTeacher,
    day,
    periods: absentPeriods,
    rows,
    message: rows.length ? '' : 'ครูท่านนี้ไม่มีคาบสอนในวันที่เลือก'
  }
}

async function saveAssignments(payload) {
  const { absentTeacher, day, leaveDate, leaveType, assignments } = payload
  const batch = writeBatch(db)

  for (const assignment of assignments) {
    const ref = doc(collection(db, 'substitutions'))
    batch.set(ref, {
      date: leaveDate,
      day_of_week: day,
      leave_type: leaveType || '',
      period: assignment.period,
      absent_teacher_name: absentTeacher,
      substitute_teacher_name: assignment.substituteTeacher,
      created_at: new Date().toISOString()
    })
  }

  // increment ด้วย Firestore atomic operation (ใช้ teacher name เป็น doc ID)
  batch.update(doc(db, 'teachers', absentTeacher), { leave_count: increment(1) })
  for (const assignment of assignments) {
    batch.update(doc(db, 'teachers', assignment.substituteTeacher), { substitute_count: increment(1) })
  }

  await batch.commit()

  const updatedSnap = await getDocs(collection(db, 'teachers'))
  const stats = {}
  updatedSnap.forEach(d => {
    const t = d.data()
    stats[t.name] = { leaveCount: t.leave_count || 0, substituteCount: t.substitute_count || 0 }
  })

  return { ok: true, message: 'บันทึกสถิติเรียบร้อยแล้ว', stats }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatThaiDate(value) {
  if (!value) return ''
  const parts = value.split('-').map(Number)
  if (parts.length !== 3) return value
  const date = new Date(parts[0], parts[1] - 1, parts[2])
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatDateTime(date) {
  return date.toLocaleString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}
