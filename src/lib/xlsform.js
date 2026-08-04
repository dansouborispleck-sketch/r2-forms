export function countSurveyQuestions(xlsform) {
  return ((xlsform && xlsform.survey) || []).filter(
    (r) => r.type !== 'begin_group' && r.type !== 'end_group' && r.type !== 'begin_repeat' && r.type !== 'end_repeat'
  );
}
