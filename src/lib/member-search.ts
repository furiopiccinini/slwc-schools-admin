type SearchableMember = {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  fiscalCode?: string | null
  epsCardNumber?: string | null
  residenceCity?: string | null
  documentNumber?: string | null
  school?: { name?: string | null } | null
}

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

export function matchesMemberQuery(member: SearchableMember, query: string) {
  const terms = fold(query).split(" ").filter(Boolean)
  if (terms.length === 0) return true

  const haystack = fold(
    [
      member.firstName,
      member.lastName,
      member.email,
      member.phone,
      member.fiscalCode,
      member.epsCardNumber,
      member.residenceCity,
      member.documentNumber,
      member.school?.name,
    ]
      .filter(Boolean)
      .join(" ")
  )

  return terms.every((term) => haystack.includes(term))
}
