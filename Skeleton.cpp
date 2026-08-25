/*******************************************************************/
/*                                                                 */
/*                      ADOBE CONFIDENTIAL                         */
/*                   _ _ _ _ _ _ _ _ _ _ _ _ _                     */
/*                                                                 */
/* Copyright 2007-2023 Adobe Inc.                                  */
/* All Rights Reserved.                                            */
/*                                                                 */
/* NOTICE:  All information contained herein is, and remains the   */
/* property of Adobe Inc. and its suppliers, if                    */
/* any.  The intellectual and technical concepts contained         */
/* herein are proprietary to Adobe Inc. and its                    */
/* suppliers and may be covered by U.S. and Foreign Patents,       */
/* patents in process, and are protected by trade secret or        */
/* copyright law.  Dissemination of this information or            */
/* reproduction of this material is strictly forbidden unless      */
/* prior written permission is obtained from Adobe Inc.            */
/* Incorporated.                                                   */
/*                                                                 */
/*******************************************************************/

/*	Skeleton.cpp	

	This is a compiling husk of a project. Fill it in with interesting
	pixel processing code.
	
	Revision History

	Version		Change													Engineer	Date
	=======		======													========	======
	1.0			(seemed like a good idea at the time)					bbb			6/1/2002

	1.0			Okay, I'm leaving the version at 1.0,					bbb			2/15/2006
				for obvious reasons; you're going to 
				copy these files directly! This is the
				first XCode version, though.

	1.0			Let's simplify this barebones sample					zal			11/11/2010

	1.0			Added new entry point									zal			9/18/2017
	1.1			Added 'Support URL' to PiPL and entry point				cjr			3/31/2023

*/

#include "Skeleton.h"

#include <cfloat>
#include <cmath>
#include <cstring>

static AEGP_PluginID S_cornerFlexPluginId = 0;

static PF_FpLong
MinFpLong(
	PF_FpLong a,
	PF_FpLong b)
{
	return a < b ? a : b;
}

static PF_FpLong
MaxFpLong(
	PF_FpLong a,
	PF_FpLong b)
{
	return a > b ? a : b;
}

static PF_Err 
About (	
	PF_InData		*in_data,
	PF_OutData		*out_data,
	PF_ParamDef		*params[],
	PF_LayerDef		*output )
{
	AEGP_SuiteHandler suites(in_data->pica_basicP);
	
	suites.ANSICallbacksSuite1()->sprintf(
        out_data->return_msg,
        "%s v%d.%d\r%s",
        STR(StrID_Name),
        MAJOR_VERSION,
        MINOR_VERSION,
        STR(StrID_Description));
        
	return PF_Err_NONE;
}

static PF_Err 
GlobalSetup (	
	PF_InData		*in_data,
	PF_OutData		*out_data,
	PF_ParamDef		*params[],
	PF_LayerDef		*output )
{
	PF_Err err = PF_Err_NONE;

	out_data->my_version = PF_VERSION(	MAJOR_VERSION,
										MINOR_VERSION,
										BUG_VERSION,
										STAGE_VERSION,
										BUILD_VERSION);

	out_data->out_flags =  PF_OutFlag_DEEP_COLOR_AWARE;	// just 16bpc, not 32bpc

	if (in_data->appl_id == kAppID_AfterEffects) {
		AEGP_SuiteHandler suites(in_data->pica_basicP);

		ERR(suites.UtilitySuite3()->AEGP_RegisterWithAEGP(
			NULL,
			STR(StrID_Name),
			&S_cornerFlexPluginId));
	}

	return err;
}

static PF_Err
ParamsSetup(
	PF_InData* in_data,
	PF_OutData* out_data,
	PF_ParamDef* params[],
	PF_LayerDef* output)
{
	PF_Err err = PF_Err_NONE;
	PF_ParamDef def;

	AEFX_CLR_STRUCT(def);

	def.flags = PF_ParamFlag_SUPERVISE;

	PF_ADD_CHECKBOX(
		"Link Trim",
		"",
		TRUE,
		0,
		LINK_TRIM_DISK_ID);

	AEFX_CLR_STRUCT(def);

	PF_ADD_FLOAT_SLIDERX(
		"Trim",
		0,
		100,
		0,
		100,
		10,
		PF_Precision_HUNDREDTHS,
		0,
		0,
		TRIM_DISK_ID);

	AEFX_CLR_STRUCT(def);

	PF_ADD_FLOAT_SLIDERX(
		"Trim Left",
		0,
		100,
		0,
		100,
		0,
		PF_Precision_HUNDREDTHS,
		0,
		0,
		TRIM_LEFT_DISK_ID);

	AEFX_CLR_STRUCT(def);

	PF_ADD_FLOAT_SLIDERX(
		"Trim Top",
		0,
		100,
		0,
		100,
		0,
		PF_Precision_HUNDREDTHS,
		0,
		0,
		TRIM_TOP_DISK_ID);

	AEFX_CLR_STRUCT(def);

	PF_ADD_FLOAT_SLIDERX(
		"Trim Right",
		0,
		100,
		0,
		100,
		0,
		PF_Precision_HUNDREDTHS,
		0,
		0,
		TRIM_RIGHT_DISK_ID);

	AEFX_CLR_STRUCT(def);

	PF_ADD_FLOAT_SLIDERX(
		"Trim Bottom",
		0,
		100,
		0,
		100,
		0,
		PF_Precision_HUNDREDTHS,
		0,
		0,
		TRIM_BOTTOM_DISK_ID);

	AEFX_CLR_STRUCT(def);

	def.flags =
		PF_ParamFlag_CANNOT_TIME_VARY |
		PF_ParamFlag_CANNOT_INTERP |
		PF_ParamFlag_USE_VALUE_FOR_OLD_PROJECTS;

	def.ui_flags = PF_PUI_INVISIBLE;

	PF_ADD_SLIDER(
		CF_TARGET_STATE_VERSION_MATCH_NAME,
		0,
		INT32_MAX,
		0,
		1,
		CF_GEOMETRY_TARGET_STATE_VERSION,
		TARGET_STATE_VERSION_DISK_ID);

	AEFX_CLR_STRUCT(def);

	def.flags =
		PF_ParamFlag_CANNOT_TIME_VARY |
		PF_ParamFlag_CANNOT_INTERP |
		PF_ParamFlag_USE_VALUE_FOR_OLD_PROJECTS;

	def.ui_flags = PF_PUI_INVISIBLE;

	PF_ADD_CHECKBOX(
		CF_TARGET_IDENTITY_VALID_MATCH_NAME,
		"",
		FALSE,
		0,
		TARGET_IDENTITY_VALID_DISK_ID);

	AEFX_CLR_STRUCT(def);

	def.flags =
		PF_ParamFlag_CANNOT_TIME_VARY |
		PF_ParamFlag_CANNOT_INTERP |
		PF_ParamFlag_USE_VALUE_FOR_OLD_PROJECTS;

	def.ui_flags = PF_PUI_INVISIBLE;

	PF_ADD_SLIDER(
		CF_TARGET_LAYER_ID_MATCH_NAME,
		INT32_MIN,
		INT32_MAX,
		INT32_MIN,
		INT32_MAX,
		0,
		TARGET_LAYER_ID_DISK_ID);

	AEFX_CLR_STRUCT(def);

	def.flags =
		PF_ParamFlag_CANNOT_TIME_VARY |
		PF_ParamFlag_CANNOT_INTERP |
		PF_ParamFlag_USE_VALUE_FOR_OLD_PROJECTS;

	def.ui_flags = PF_PUI_INVISIBLE;

	PF_ADD_SLIDER(
		CF_TARGET_UNIQUE_STREAM_ID_MATCH_NAME,
		INT32_MIN,
		INT32_MAX,
		INT32_MIN,
		INT32_MAX,
		0,
		TARGET_UNIQUE_STREAM_ID_DISK_ID);

	const PF_ParamFlags snapshotParamFlags =
		PF_ParamFlag_CANNOT_TIME_VARY |
		PF_ParamFlag_CANNOT_INTERP |
		PF_ParamFlag_USE_VALUE_FOR_OLD_PROJECTS;

	AEFX_CLR_STRUCT(def);

	def.flags = snapshotParamFlags;
	def.ui_flags = PF_PUI_INVISIBLE;

	PF_ADD_SLIDER(
		CF_RECTANGLE_SNAPSHOT_VERSION_MATCH_NAME,
		0,
		INT32_MAX,
		0,
		1,
		CF_RECTANGLE_GEOMETRY_SNAPSHOT_VERSION,
		RECTANGLE_SNAPSHOT_VERSION_DISK_ID);

	AEFX_CLR_STRUCT(def);

	def.flags = snapshotParamFlags;
	def.ui_flags = PF_PUI_INVISIBLE;

	PF_ADD_CHECKBOX(
		CF_RECTANGLE_SNAPSHOT_VALID_MATCH_NAME,
		"",
		FALSE,
		0,
		RECTANGLE_SNAPSHOT_VALID_DISK_ID);

	AEFX_CLR_STRUCT(def);

	def.flags = snapshotParamFlags;
	def.ui_flags = PF_PUI_INVISIBLE;

	PF_ADD_FLOAT_SLIDER(
		CF_RECTANGLE_SNAPSHOT_SIZE_X_MATCH_NAME,
		0.0,
		FLT_MAX,
		0.0,
		FLT_MAX,
		AEFX_DEFAULT_CURVE_TOLERANCE,
		0.0,
		PF_Precision_TEN_THOUSANDTHS,
		0,
		false,
		RECTANGLE_SNAPSHOT_SIZE_X_DISK_ID);

	AEFX_CLR_STRUCT(def);

	def.flags = snapshotParamFlags;
	def.ui_flags = PF_PUI_INVISIBLE;

	PF_ADD_FLOAT_SLIDER(
		CF_RECTANGLE_SNAPSHOT_SIZE_Y_MATCH_NAME,
		0.0,
		FLT_MAX,
		0.0,
		FLT_MAX,
		AEFX_DEFAULT_CURVE_TOLERANCE,
		0.0,
		PF_Precision_TEN_THOUSANDTHS,
		0,
		false,
		RECTANGLE_SNAPSHOT_SIZE_Y_DISK_ID);

	AEFX_CLR_STRUCT(def);

	def.flags = snapshotParamFlags;
	def.ui_flags = PF_PUI_INVISIBLE;

	PF_ADD_FLOAT_SLIDER(
		CF_RECTANGLE_SNAPSHOT_POSITION_X_MATCH_NAME,
		-FLT_MAX,
		FLT_MAX,
		-FLT_MAX,
		FLT_MAX,
		AEFX_DEFAULT_CURVE_TOLERANCE,
		0.0,
		PF_Precision_TEN_THOUSANDTHS,
		0,
		false,
		RECTANGLE_SNAPSHOT_POSITION_X_DISK_ID);

	AEFX_CLR_STRUCT(def);

	def.flags = snapshotParamFlags;
	def.ui_flags = PF_PUI_INVISIBLE;

	PF_ADD_FLOAT_SLIDER(
		CF_RECTANGLE_SNAPSHOT_POSITION_Y_MATCH_NAME,
		-FLT_MAX,
		FLT_MAX,
		-FLT_MAX,
		FLT_MAX,
		AEFX_DEFAULT_CURVE_TOLERANCE,
		0.0,
		PF_Precision_TEN_THOUSANDTHS,
		0,
		false,
		RECTANGLE_SNAPSHOT_POSITION_Y_DISK_ID);

	AEFX_CLR_STRUCT(def);

	def.flags = snapshotParamFlags;
	def.ui_flags = PF_PUI_INVISIBLE;

	PF_ADD_FLOAT_SLIDER(
		CF_RECTANGLE_SNAPSHOT_ROUNDNESS_MATCH_NAME,
		0.0,
		FLT_MAX,
		0.0,
		FLT_MAX,
		AEFX_DEFAULT_CURVE_TOLERANCE,
		0.0,
		PF_Precision_TEN_THOUSANDTHS,
		0,
		false,
		RECTANGLE_SNAPSHOT_ROUNDNESS_DISK_ID);

	AEFX_CLR_STRUCT(def);

	def.flags = snapshotParamFlags;
	def.ui_flags = PF_PUI_INVISIBLE;

	PF_ADD_SLIDER(
		CF_RECTANGLE_SNAPSHOT_DIRECTION_MATCH_NAME,
		INT32_MIN,
		INT32_MAX,
		INT32_MIN,
		INT32_MAX,
		0,
		RECTANGLE_SNAPSHOT_DIRECTION_DISK_ID);

	AEFX_CLR_STRUCT(def);

	def.flags = snapshotParamFlags;
	def.ui_flags = PF_PUI_INVISIBLE;

	PF_ADD_CHECKBOX(
		CF_RECTANGLE_SNAPSHOT_ENABLED_MATCH_NAME,
		"",
		FALSE,
		0,
		RECTANGLE_SNAPSHOT_ENABLED_DISK_ID);

	const PF_ParamFlags pathParamFlags =
		PF_ParamFlag_CANNOT_TIME_VARY |
		PF_ParamFlag_CANNOT_INTERP |
		PF_ParamFlag_USE_VALUE_FOR_OLD_PROJECTS;

	AEFX_CLR_STRUCT(def);
	def.flags = pathParamFlags;
	def.ui_flags = PF_PUI_INVISIBLE;
	PF_ADD_SLIDER(CF_GEOMETRY_TARGET_PATH_VERSION_MATCH_NAME, 0, INT32_MAX, 0, 1, 1, GEOMETRY_TARGET_PATH_VERSION_DISK_ID);
	AEFX_CLR_STRUCT(def);
	def.flags = pathParamFlags;
	def.ui_flags = PF_PUI_INVISIBLE;
	PF_ADD_CHECKBOX(CF_GEOMETRY_TARGET_PATH_VALID_MATCH_NAME, "", FALSE, 0, GEOMETRY_TARGET_PATH_VALID_DISK_ID);
	AEFX_CLR_STRUCT(def);
	def.flags = pathParamFlags;
	def.ui_flags = PF_PUI_INVISIBLE;
	PF_ADD_SLIDER(CF_GEOMETRY_TARGET_PATH_COUNT_MATCH_NAME, 0, CF_GEOMETRY_TARGET_PATH_MAX_DEPTH, 0, CF_GEOMETRY_TARGET_PATH_MAX_DEPTH, 0, GEOMETRY_TARGET_PATH_COUNT_DISK_ID);

	AEFX_CLR_STRUCT(def);
	def.flags = pathParamFlags;
	def.ui_flags = PF_PUI_INVISIBLE;
	PF_ADD_SLIDER(CF_GEOMETRY_TARGET_PATH_SEGMENT_INDEX_PREFIX "0", 0, INT32_MAX, 0, INT32_MAX, 0, GEOMETRY_TARGET_PATH_SEGMENT_INDEX_0_DISK_ID);
	AEFX_CLR_STRUCT(def); def.flags = pathParamFlags; def.ui_flags = PF_PUI_INVISIBLE;
	PF_ADD_SLIDER(CF_GEOMETRY_TARGET_PATH_SEGMENT_TOKEN_PREFIX "0", 0, 4, 0, 4, 0, GEOMETRY_TARGET_PATH_SEGMENT_TOKEN_0_DISK_ID);
	AEFX_CLR_STRUCT(def); def.flags = pathParamFlags; def.ui_flags = PF_PUI_INVISIBLE;
	PF_ADD_SLIDER(CF_GEOMETRY_TARGET_PATH_SEGMENT_INDEX_PREFIX "1", 0, INT32_MAX, 0, INT32_MAX, 0, GEOMETRY_TARGET_PATH_SEGMENT_INDEX_1_DISK_ID);
	AEFX_CLR_STRUCT(def); def.flags = pathParamFlags; def.ui_flags = PF_PUI_INVISIBLE;
	PF_ADD_SLIDER(CF_GEOMETRY_TARGET_PATH_SEGMENT_TOKEN_PREFIX "1", 0, 4, 0, 4, 0, GEOMETRY_TARGET_PATH_SEGMENT_TOKEN_1_DISK_ID);
	AEFX_CLR_STRUCT(def); def.flags = pathParamFlags; def.ui_flags = PF_PUI_INVISIBLE;
	PF_ADD_SLIDER(CF_GEOMETRY_TARGET_PATH_SEGMENT_INDEX_PREFIX "2", 0, INT32_MAX, 0, INT32_MAX, 0, GEOMETRY_TARGET_PATH_SEGMENT_INDEX_2_DISK_ID);
	AEFX_CLR_STRUCT(def); def.flags = pathParamFlags; def.ui_flags = PF_PUI_INVISIBLE;
	PF_ADD_SLIDER(CF_GEOMETRY_TARGET_PATH_SEGMENT_TOKEN_PREFIX "2", 0, 4, 0, 4, 0, GEOMETRY_TARGET_PATH_SEGMENT_TOKEN_2_DISK_ID);
	AEFX_CLR_STRUCT(def); def.flags = pathParamFlags; def.ui_flags = PF_PUI_INVISIBLE;
	PF_ADD_SLIDER(CF_GEOMETRY_TARGET_PATH_SEGMENT_INDEX_PREFIX "3", 0, INT32_MAX, 0, INT32_MAX, 0, GEOMETRY_TARGET_PATH_SEGMENT_INDEX_3_DISK_ID);
	AEFX_CLR_STRUCT(def); def.flags = pathParamFlags; def.ui_flags = PF_PUI_INVISIBLE;
	PF_ADD_SLIDER(CF_GEOMETRY_TARGET_PATH_SEGMENT_TOKEN_PREFIX "3", 0, 4, 0, 4, 0, GEOMETRY_TARGET_PATH_SEGMENT_TOKEN_3_DISK_ID);
	AEFX_CLR_STRUCT(def); def.flags = pathParamFlags; def.ui_flags = PF_PUI_INVISIBLE;
	PF_ADD_SLIDER(CF_GEOMETRY_TARGET_PATH_SEGMENT_INDEX_PREFIX "4", 0, INT32_MAX, 0, INT32_MAX, 0, GEOMETRY_TARGET_PATH_SEGMENT_INDEX_4_DISK_ID);
	AEFX_CLR_STRUCT(def); def.flags = pathParamFlags; def.ui_flags = PF_PUI_INVISIBLE;
	PF_ADD_SLIDER(CF_GEOMETRY_TARGET_PATH_SEGMENT_TOKEN_PREFIX "4", 0, 4, 0, 4, 0, GEOMETRY_TARGET_PATH_SEGMENT_TOKEN_4_DISK_ID);
	AEFX_CLR_STRUCT(def); def.flags = pathParamFlags; def.ui_flags = PF_PUI_INVISIBLE;
	PF_ADD_SLIDER(CF_GEOMETRY_TARGET_PATH_SEGMENT_INDEX_PREFIX "5", 0, INT32_MAX, 0, INT32_MAX, 0, GEOMETRY_TARGET_PATH_SEGMENT_INDEX_5_DISK_ID);
	AEFX_CLR_STRUCT(def); def.flags = pathParamFlags; def.ui_flags = PF_PUI_INVISIBLE;
	PF_ADD_SLIDER(CF_GEOMETRY_TARGET_PATH_SEGMENT_TOKEN_PREFIX "5", 0, 4, 0, 4, 0, GEOMETRY_TARGET_PATH_SEGMENT_TOKEN_5_DISK_ID);
	AEFX_CLR_STRUCT(def); def.flags = pathParamFlags; def.ui_flags = PF_PUI_INVISIBLE;
	PF_ADD_SLIDER(CF_GEOMETRY_TARGET_PATH_SEGMENT_INDEX_PREFIX "6", 0, INT32_MAX, 0, INT32_MAX, 0, GEOMETRY_TARGET_PATH_SEGMENT_INDEX_6_DISK_ID);
	AEFX_CLR_STRUCT(def); def.flags = pathParamFlags; def.ui_flags = PF_PUI_INVISIBLE;
	PF_ADD_SLIDER(CF_GEOMETRY_TARGET_PATH_SEGMENT_TOKEN_PREFIX "6", 0, 4, 0, 4, 0, GEOMETRY_TARGET_PATH_SEGMENT_TOKEN_6_DISK_ID);
	AEFX_CLR_STRUCT(def); def.flags = pathParamFlags; def.ui_flags = PF_PUI_INVISIBLE;
	PF_ADD_SLIDER(CF_GEOMETRY_TARGET_PATH_SEGMENT_INDEX_PREFIX "7", 0, INT32_MAX, 0, INT32_MAX, 0, GEOMETRY_TARGET_PATH_SEGMENT_INDEX_7_DISK_ID);
	AEFX_CLR_STRUCT(def); def.flags = pathParamFlags; def.ui_flags = PF_PUI_INVISIBLE;
	PF_ADD_SLIDER(CF_GEOMETRY_TARGET_PATH_SEGMENT_TOKEN_PREFIX "7", 0, 4, 0, 4, 0, GEOMETRY_TARGET_PATH_SEGMENT_TOKEN_7_DISK_ID);

	out_data->num_params = CORNERFLEX_NUM_PARAMS;

	return err;
}

static PF_Err
TrimFunc16(
	void* refcon,
	A_long x,
	A_long y,
	PF_Pixel16* inP,
	PF_Pixel16* outP)
{
	PF_Err err = PF_Err_NONE;

	const CF_RenderContext* context =
		static_cast<const CF_RenderContext*>(refcon);

	const PF_FpLong leftBoundary =
		context->geometryBounds.left;

	const PF_FpLong topBoundary =
		context->geometryBounds.top;

	const PF_FpLong rightBoundary =
		context->geometryBounds.right;

	const PF_FpLong bottomBoundary =
		context->geometryBounds.bottom;

	const PF_Boolean outsideBounds =
		x < leftBoundary ||
		x >= rightBoundary ||
		y < topBoundary ||
		y >= bottomBoundary;

	const PF_Boolean outsideAffineRectangle =
		context->hasAffineRect &&
		!IsPointInsideAffineRectangle(
			context->affineRect,
			static_cast<PF_FpLong>(x) + 0.5,
			static_cast<PF_FpLong>(y) + 0.5);

	const PF_Boolean outsideOrientedRectangle =
		!context->hasAffineRect &&
		context->hasOrientedRect &&
		!IsPointInsideOrientedRectangle(
			context->orientedRect,
			static_cast<PF_FpLong>(x) + 0.5,
			static_cast<PF_FpLong>(y) + 0.5);

	if (outsideBounds ||
		outsideAffineRectangle ||
		outsideOrientedRectangle) {
		outP->alpha = 0;
		outP->red = 0;
		outP->green = 0;
		outP->blue = 0;
	}
	else {
		*outP = *inP;
	}

	return err;
}

static PF_Err
TrimFunc8(
	void* refcon,
	A_long x,
	A_long y,
	PF_Pixel8* inP,
	PF_Pixel8* outP)
{
	PF_Err err = PF_Err_NONE;

	const CF_RenderContext* context =
		static_cast<const CF_RenderContext*>(refcon);

	const PF_FpLong leftBoundary =
		context->geometryBounds.left;

	const PF_FpLong topBoundary =
		context->geometryBounds.top;

	const PF_FpLong rightBoundary =
		context->geometryBounds.right;

	const PF_FpLong bottomBoundary =
		context->geometryBounds.bottom;

	const PF_Boolean outsideBounds =
		x < leftBoundary ||
		x >= rightBoundary ||
		y < topBoundary ||
		y >= bottomBoundary;

	const PF_Boolean outsideAffineRectangle =
		context->hasAffineRect &&
		!IsPointInsideAffineRectangle(
			context->affineRect,
			static_cast<PF_FpLong>(x) + 0.5,
			static_cast<PF_FpLong>(y) + 0.5);

	const PF_Boolean outsideOrientedRectangle =
		!context->hasAffineRect &&
		context->hasOrientedRect &&
		!IsPointInsideOrientedRectangle(
			context->orientedRect,
			static_cast<PF_FpLong>(x) + 0.5,
			static_cast<PF_FpLong>(y) + 0.5);

	if (outsideBounds ||
		outsideAffineRectangle ||
		outsideOrientedRectangle) {
		outP->alpha = 0;
		outP->red = 0;
		outP->green = 0;
		outP->blue = 0;
	}
	else {
		*outP = *inP;
	}

	return err;
}

static void
ReadCornerFlexSettings(
	PF_ParamDef* params[],
	CornerFlexSettings& settings)
{
	AEFX_CLR_STRUCT(settings);

	settings.linkTrim =
		params[CORNERFLEX_LINK_TRIM]->u.bd.value;

	if (settings.linkTrim) {

		const PF_FpLong trim =
			params[CORNERFLEX_TRIM]->u.fs_d.value;

		settings.trimLeft = trim;
		settings.trimTop = trim;
		settings.trimRight = trim;
		settings.trimBottom = trim;

	}
	else {

		settings.trimLeft =
			params[CORNERFLEX_TRIM_LEFT]->u.fs_d.value;

		settings.trimTop =
			params[CORNERFLEX_TRIM_TOP]->u.fs_d.value;

		settings.trimRight =
			params[CORNERFLEX_TRIM_RIGHT]->u.fs_d.value;

		settings.trimBottom =
			params[CORNERFLEX_TRIM_BOTTOM]->u.fs_d.value;
	}
}

CF_GeometryTargetState
ReadGeometryTargetState(
	PF_ParamDef* params[])
{
	CF_GeometryTargetState targetState;
	AEFX_CLR_STRUCT(targetState);

	targetState.version =
		params[CORNERFLEX_TARGET_STATE_VERSION]->u.sd.value;

	targetState.targetIdentity.layerId =
		params[CORNERFLEX_TARGET_LAYER_ID]->u.sd.value;

	targetState.targetIdentity.uniqueStreamId =
		params[CORNERFLEX_TARGET_UNIQUE_STREAM_ID]->u.sd.value;

	const A_Boolean versionIsSupported =
		targetState.version ==
		CF_GEOMETRY_TARGET_STATE_VERSION;

	const A_Boolean validityWasRequested =
		params[CORNERFLEX_TARGET_IDENTITY_VALID]->u.bd.value
			? TRUE
			: FALSE;

	const A_Boolean identifiersAreAcceptable =
		targetState.targetIdentity.layerId !=
			AEGP_LayerIDVal_NONE &&
		targetState.targetIdentity.uniqueStreamId != 0;

	targetState.targetIdentity.isValid =
		versionIsSupported &&
		validityWasRequested &&
		identifiersAreAcceptable
			? TRUE
			: FALSE;

	return targetState;
}

CF_GeometryTargetIdentity
GetActiveGeometryTargetIdentity(
	const CF_GeometryTargetState& targetState)
{
	CF_GeometryTargetIdentity targetIdentity;
	AEFX_CLR_STRUCT(targetIdentity);

	const A_Boolean versionIsSupported =
		targetState.version ==
		CF_GEOMETRY_TARGET_STATE_VERSION;

	const A_Boolean identifiersAreAcceptable =
		targetState.targetIdentity.layerId !=
			AEGP_LayerIDVal_NONE &&
		targetState.targetIdentity.uniqueStreamId != 0;

	if (versionIsSupported &&
		targetState.targetIdentity.isValid &&
		identifiersAreAcceptable) {

		targetIdentity =
			targetState.targetIdentity;

		targetIdentity.isValid = TRUE;
	}

	return targetIdentity;
}

CF_GeometryTargetPath
ReadGeometryTargetPath(
	PF_ParamDef* params[])
{
	CF_GeometryTargetPath path;
	AEFX_CLR_STRUCT(path);

	path.version =
		params[CORNERFLEX_GEOMETRY_TARGET_PATH_VERSION]->u.sd.value;
	path.isValid =
		params[CORNERFLEX_GEOMETRY_TARGET_PATH_VALID]->u.bd.value
			? TRUE
			: FALSE;
	path.layerId =
		params[CORNERFLEX_TARGET_LAYER_ID]->u.sd.value;
	path.segmentCount =
		params[CORNERFLEX_GEOMETRY_TARGET_PATH_COUNT]->u.sd.value;

	const A_long indexParams[CF_GEOMETRY_TARGET_PATH_MAX_DEPTH] = {
		CORNERFLEX_GEOMETRY_TARGET_PATH_SEGMENT_INDEX_0,
		CORNERFLEX_GEOMETRY_TARGET_PATH_SEGMENT_INDEX_1,
		CORNERFLEX_GEOMETRY_TARGET_PATH_SEGMENT_INDEX_2,
		CORNERFLEX_GEOMETRY_TARGET_PATH_SEGMENT_INDEX_3,
		CORNERFLEX_GEOMETRY_TARGET_PATH_SEGMENT_INDEX_4,
		CORNERFLEX_GEOMETRY_TARGET_PATH_SEGMENT_INDEX_5,
		CORNERFLEX_GEOMETRY_TARGET_PATH_SEGMENT_INDEX_6,
		CORNERFLEX_GEOMETRY_TARGET_PATH_SEGMENT_INDEX_7};
	const A_long tokenParams[CF_GEOMETRY_TARGET_PATH_MAX_DEPTH] = {
		CORNERFLEX_GEOMETRY_TARGET_PATH_SEGMENT_TOKEN_0,
		CORNERFLEX_GEOMETRY_TARGET_PATH_SEGMENT_TOKEN_1,
		CORNERFLEX_GEOMETRY_TARGET_PATH_SEGMENT_TOKEN_2,
		CORNERFLEX_GEOMETRY_TARGET_PATH_SEGMENT_TOKEN_3,
		CORNERFLEX_GEOMETRY_TARGET_PATH_SEGMENT_TOKEN_4,
		CORNERFLEX_GEOMETRY_TARGET_PATH_SEGMENT_TOKEN_5,
		CORNERFLEX_GEOMETRY_TARGET_PATH_SEGMENT_TOKEN_6,
		CORNERFLEX_GEOMETRY_TARGET_PATH_SEGMENT_TOKEN_7};

	const A_long count =
		(path.segmentCount >= 0 &&
		 path.segmentCount <= CF_GEOMETRY_TARGET_PATH_MAX_DEPTH)
			? path.segmentCount
			: 0;

	for (A_long index = 0; index < count; index++) {
		path.segments[index].propertyIndex =
			params[indexParams[index]]->u.sd.value;
		path.segments[index].expectedMatchToken =
			static_cast<CF_GeometryMatchToken>(
				params[tokenParams[index]]->u.sd.value);
	}

	const A_Boolean versionIsSupported =
		path.version == CF_GEOMETRY_TARGET_PATH_VERSION;
	const A_Boolean identityIsValid =
		path.isValid &&
		path.layerId != AEGP_LayerIDVal_NONE &&
		count >= 2;
	A_Boolean tokensAreValid = TRUE;
	for (A_long index = 0; index < count; index++) {
		const CF_GeometryPathSegment& segment = path.segments[index];
		const A_Boolean indexIsValid =
			(index == 0 && segment.propertyIndex == 0) ||
			(index > 0 && segment.propertyIndex > 0);
		const A_Boolean tokenIsValid =
			segment.expectedMatchToken >= CF_MATCH_ROOT_VECTORS_GROUP &&
			segment.expectedMatchToken <= CF_MATCH_RECTANGLE_PATH;
		tokensAreValid = tokensAreValid && indexIsValid && tokenIsValid;
	}
	if (count < 2) {
		tokensAreValid = FALSE;
	}
	else {
		tokensAreValid = tokensAreValid &&
			path.segments[0].expectedMatchToken ==
				CF_MATCH_ROOT_VECTORS_GROUP &&
			path.segments[count - 1].expectedMatchToken ==
				CF_MATCH_RECTANGLE_PATH;
	}

	path.isValid =
		versionIsSupported && identityIsValid && tokensAreValid
			? TRUE
			: FALSE;
	return path;
}

static const A_char*
MatchNameForGeometryToken(
	CF_GeometryMatchToken token)
{
	switch (token) {
		case CF_MATCH_ROOT_VECTORS_GROUP:
			return "ADBE Root Vectors Group";
		case CF_MATCH_VECTOR_GROUP:
			return "ADBE Vector Group";
		case CF_MATCH_VECTORS_GROUP:
			return "ADBE Vectors Group";
		case CF_MATCH_RECTANGLE_PATH:
			return "ADBE Vector Shape - Rect";
		default:
			return NULL;
	}
}

static CF_GeometryMatchToken
GeometryTokenForMatchName(
	const A_char* matchName)
{
	if (!matchName) {
		return CF_MATCH_TOKEN_INVALID;
	}
	if (!strcmp(matchName, "ADBE Root Vectors Group")) {
		return CF_MATCH_ROOT_VECTORS_GROUP;
	}
	if (!strcmp(matchName, "ADBE Vector Group")) {
		return CF_MATCH_VECTOR_GROUP;
	}
	if (!strcmp(matchName, "ADBE Vectors Group")) {
		return CF_MATCH_VECTORS_GROUP;
	}
	if (!strcmp(matchName, "ADBE Vector Shape - Rect")) {
		return CF_MATCH_RECTANGLE_PATH;
	}
	return CF_MATCH_TOKEN_INVALID;
}

static CF_GeometryTargetLocation
ResolveGeometryTargetPathFromAfterEffects(
	PF_InData* in_data,
	const CF_GeometryTargetPath& path,
	CF_GeometryTargetResolutionDiagnostic* diagnostic)
{
	CF_GeometryTargetLocation location;
	AEFX_CLR_STRUCT(location);
	if (diagnostic) {
		AEFX_CLR_STRUCT(*diagnostic);
		diagnostic->version =
			CF_GEOMETRY_TARGET_RESOLUTION_DIAGNOSTIC_VERSION;
		diagnostic->wasAttempted = FALSE;
		diagnostic->status = CF_TARGET_RESOLVE_NOT_ATTEMPTED;
		diagnostic->requestedLayerId = path.layerId;
		diagnostic->requestedSegmentCount = path.segmentCount;
		diagnostic->mismatchSegmentIndex = -1;
	}

	if (!in_data || !path.isValid || !in_data->pica_basicP) {
		if (diagnostic) {
			diagnostic->status = CF_TARGET_RESOLVE_INVALID_REQUEST;
		}
		return location;
	}

	AEGP_SuiteHandler suites(in_data->pica_basicP);
	AEGP_PFInterfaceSuite1* pfInterfaceSuite = NULL;
	AEGP_LayerSuite9* layerSuite = NULL;
	AEGP_DynamicStreamSuite4* dynamicStreamSuite = NULL;
	AEGP_StreamSuite6* streamSuite = NULL;
	try {
		pfInterfaceSuite = suites.PFInterfaceSuite1();
		layerSuite = suites.LayerSuite9();
		dynamicStreamSuite = suites.DynamicStreamSuite4();
		streamSuite = suites.StreamSuite6();
	}
	catch (...) {
		return location;
	}

	AEGP_LayerH layerH = NULL;
	AEGP_LayerIDVal layerId = AEGP_LayerIDVal_NONE;
	AEGP_StreamRefH currentH = NULL;
	if (diagnostic) {
		diagnostic->wasAttempted = TRUE;
	}
	A_Err err = pfInterfaceSuite->AEGP_GetEffectLayer(
		in_data->effect_ref, &layerH);
	if (!err && layerH) {
		err = layerSuite->AEGP_GetLayerID(layerH, &layerId);
	}
	if (err || layerId != path.layerId) {
		if (diagnostic) {
			diagnostic->status = CF_TARGET_RESOLVE_LAYER_MISMATCH;
			diagnostic->resolvedLayerId = layerId;
		}
		return location;
	}
	if (!dynamicStreamSuite->AEGP_GetNewStreamRefForLayer(
		S_cornerFlexPluginId, layerH, &currentH)) {
		for (A_long index = 0;
			index < path.segmentCount && currentH;
			index++) {
			const CF_GeometryPathSegment& segment = path.segments[index];
			const A_char* expectedMatchName =
				MatchNameForGeometryToken(
					segment.expectedMatchToken);
			if (!expectedMatchName) {
				if (diagnostic) {
					diagnostic->status = CF_TARGET_RESOLVE_INVALID_REQUEST;
					diagnostic->mismatchSegmentIndex = index;
				}
				break;
			}

			AEGP_StreamRefH nextH = NULL;
			if (index == 0 &&
				segment.expectedMatchToken ==
					CF_MATCH_ROOT_VECTORS_GROUP) {
				err = dynamicStreamSuite->AEGP_GetNewStreamRefByMatchname(
					S_cornerFlexPluginId,
					currentH,
					expectedMatchName,
					&nextH);
			}
			else {
				err = dynamicStreamSuite->AEGP_GetNewStreamRefByIndex(
					S_cornerFlexPluginId,
					currentH,
					segment.propertyIndex - 1,
					&nextH);
			}
			if (err || !nextH) {
				if (diagnostic) {
					diagnostic->status = CF_TARGET_RESOLVE_STREAM_ERROR;
					diagnostic->mismatchSegmentIndex = index;
				}
				break;
			}

			A_char actualMatchName[AEGP_MAX_STREAM_MATCH_NAME_SIZE] = {};
			err = dynamicStreamSuite->AEGP_GetMatchName(
				nextH, actualMatchName);
			const CF_GeometryMatchToken actualToken =
				GeometryTokenForMatchName(actualMatchName);
			if (diagnostic) {
				diagnostic->resolvedSegmentCount = index + 1;
				diagnostic->finalExpectedToken =
					segment.expectedMatchToken;
				diagnostic->finalResolvedToken = actualToken;
			}
			if (err || strcmp(actualMatchName, expectedMatchName) != 0) {
				if (diagnostic) {
					diagnostic->status = CF_TARGET_RESOLVE_MATCH_NAME_MISMATCH;
					diagnostic->mismatchSegmentIndex = index;
				}
				streamSuite->AEGP_DisposeStream(nextH);
				break;
			}

			streamSuite->AEGP_DisposeStream(currentH);
			currentH = nextH;
			if (index == path.segmentCount - 1) {
				int32_t uniqueStreamId = 0;
				if (!streamSuite->AEGP_GetUniqueStreamID(
					currentH, &uniqueStreamId)) {
					location.wasFound = TRUE;
					location.isRectanglePath = TRUE;
					location.uniqueStreamId = uniqueStreamId;
					if (diagnostic) {
						diagnostic->status =
							location.isRectanglePath
								? CF_TARGET_RESOLVE_OK
								: CF_TARGET_RESOLVE_FINAL_NOT_RECTANGLE;
						diagnostic->finalUniqueStreamId = uniqueStreamId;
						diagnostic->resolvedLayerId = layerId;
					}
				}
				else {
					if (diagnostic) {
						diagnostic->status = CF_TARGET_RESOLVE_STREAM_ERROR;
					}
				}
			}
		}
	}

	if (currentH) {
		streamSuite->AEGP_DisposeStream(currentH);
	}
	return location;
}

// Resolves the persisted hierarchy and returns the final stream only to the
// caller that needs to inspect its parent chain. The caller owns the result.
static A_Err
ResolveGeometryTargetPathStreamFromAfterEffects(
	PF_InData* in_data,
	const CF_GeometryTargetPath& path,
	AEGP_PFInterfaceSuite1* pfInterfaceSuite,
	AEGP_LayerSuite9* layerSuite,
	AEGP_DynamicStreamSuite4* dynamicStreamSuite,
	AEGP_StreamSuite6* streamSuite,
	AEGP_StreamRefH* finalStreamH)
{
	if (finalStreamH) {
		*finalStreamH = NULL;
	}
	if (!in_data || !path.isValid || !finalStreamH ||
		!pfInterfaceSuite || !layerSuite || !dynamicStreamSuite ||
		!streamSuite) {
		return A_Err_GENERIC;
	}

	AEGP_LayerH layerH = NULL;
	AEGP_LayerIDVal layerId = AEGP_LayerIDVal_NONE;
	AEGP_StreamRefH currentH = NULL;
	A_Err err = pfInterfaceSuite->AEGP_GetEffectLayer(
		in_data->effect_ref, &layerH);
	if (!err && layerH) {
		err = layerSuite->AEGP_GetLayerID(layerH, &layerId);
	}
	if (err || layerId != path.layerId) {
		return err ? err : A_Err_GENERIC;
	}

	err = dynamicStreamSuite->AEGP_GetNewStreamRefForLayer(
		S_cornerFlexPluginId, layerH, &currentH);
	for (A_long index = 0;
		!err && currentH && index < path.segmentCount;
		index++) {
		const CF_GeometryPathSegment& segment = path.segments[index];
		const A_char* expectedMatchName =
			MatchNameForGeometryToken(segment.expectedMatchToken);
		if (!expectedMatchName) {
			err = A_Err_GENERIC;
			break;
		}

		AEGP_StreamRefH nextH = NULL;
		if (index == 0 &&
			segment.expectedMatchToken == CF_MATCH_ROOT_VECTORS_GROUP) {
			err = dynamicStreamSuite->AEGP_GetNewStreamRefByMatchname(
				S_cornerFlexPluginId, currentH, expectedMatchName, &nextH);
		}
		else if (segment.propertyIndex > 0) {
			err = dynamicStreamSuite->AEGP_GetNewStreamRefByIndex(
				S_cornerFlexPluginId, currentH,
				segment.propertyIndex - 1, &nextH);
		}
		else {
			err = A_Err_GENERIC;
		}

		if (err || !nextH) {
			if (nextH) {
				streamSuite->AEGP_DisposeStream(nextH);
			}
			break;
		}

		A_char actualMatchName[AEGP_MAX_STREAM_MATCH_NAME_SIZE] = {};
		err = dynamicStreamSuite->AEGP_GetMatchName(
			nextH, actualMatchName);
		if (err || strcmp(actualMatchName, expectedMatchName) != 0) {
			streamSuite->AEGP_DisposeStream(nextH);
			err = A_Err_GENERIC;
			break;
		}

		streamSuite->AEGP_DisposeStream(currentH);
		currentH = nextH;
	}

	if (!err && currentH) {
		A_char finalMatchName[AEGP_MAX_STREAM_MATCH_NAME_SIZE] = {};
		err = dynamicStreamSuite->AEGP_GetMatchName(
			currentH, finalMatchName);
		if (!err && strcmp(
			finalMatchName, "ADBE Vector Shape - Rect") == 0) {
			*finalStreamH = currentH;
			currentH = NULL;
		}
		else if (!err) {
			err = A_Err_GENERIC;
		}
	}

	if (currentH) {
		streamSuite->AEGP_DisposeStream(currentH);
	}
	return err;
}

CF_RectangleGeometrySnapshot
MakeInvalidRectangleGeometrySnapshot()
{
	CF_RectangleGeometrySnapshot snapshot;
	AEFX_CLR_STRUCT(snapshot);

	snapshot.version =
		CF_RECTANGLE_GEOMETRY_SNAPSHOT_VERSION;

	snapshot.isValid = FALSE;

	return snapshot;
}

A_Boolean
ValidateRectangleGeometrySnapshot(
	const CF_RectangleGeometrySnapshot& snapshot)
{
	const A_Boolean versionIsSupported =
		snapshot.version ==
		CF_RECTANGLE_GEOMETRY_SNAPSHOT_VERSION;

	const A_Boolean valuesAreFinite =
		std::isfinite(snapshot.sizeX) &&
		std::isfinite(snapshot.sizeY) &&
		std::isfinite(snapshot.positionX) &&
		std::isfinite(snapshot.positionY) &&
		std::isfinite(snapshot.roundness);

	const A_Boolean dimensionsAreNonNegative =
		snapshot.sizeX >= 0 &&
		snapshot.sizeY >= 0;

	// No official numeric range for Shape Direction is confirmed yet.
	return versionIsSupported &&
		snapshot.isValid &&
		valuesAreFinite &&
		dimensionsAreNonNegative
			? TRUE
			: FALSE;
}

CF_RectangleGeometrySnapshot
ReadRectangleGeometrySnapshot(
	PF_ParamDef* params[])
{
	CF_RectangleGeometrySnapshot snapshot =
		MakeInvalidRectangleGeometrySnapshot();

	snapshot.version =
		params[CORNERFLEX_RECTANGLE_SNAPSHOT_VERSION]->u.sd.value;

	snapshot.isValid =
		params[CORNERFLEX_RECTANGLE_SNAPSHOT_VALID]->u.bd.value
			? TRUE
			: FALSE;

	snapshot.sizeX =
		params[CORNERFLEX_RECTANGLE_SNAPSHOT_SIZE_X]->u.fs_d.value;

	snapshot.sizeY =
		params[CORNERFLEX_RECTANGLE_SNAPSHOT_SIZE_Y]->u.fs_d.value;

	snapshot.positionX =
		params[CORNERFLEX_RECTANGLE_SNAPSHOT_POSITION_X]->u.fs_d.value;

	snapshot.positionY =
		params[CORNERFLEX_RECTANGLE_SNAPSHOT_POSITION_Y]->u.fs_d.value;

	snapshot.roundness =
		params[CORNERFLEX_RECTANGLE_SNAPSHOT_ROUNDNESS]->u.fs_d.value;

	snapshot.direction =
		params[CORNERFLEX_RECTANGLE_SNAPSHOT_DIRECTION]->u.sd.value;

	return snapshot;
}

A_Boolean
IsRectangleSnapshotSourceEnabled(
	PF_ParamDef* params[])
{
	return params[CORNERFLEX_RECTANGLE_SNAPSHOT_ENABLED]->u.bd.value
		? TRUE
		: FALSE;
}

CF_Rect
TransformLocalBoundsWithLayerTransform2D(
	const CF_Rect& localBounds,
	const CF_RectangleCoordinateContext& coordinateContext,
	const CF_LayerTransform2DContext& layerTransformContext)
{
	const CF_AffineTransform2D layerTransform =
		BuildLayerTransform2D(
			coordinateContext,
			layerTransformContext);

	const CF_OrientedRectangle localRectangle =
		BuildAxisAlignedOrientedRectangle(localBounds);

	const CF_OrientedRectangle transformedRectangle =
		TransformOrientedRectangle(
			localRectangle,
			layerTransform);

	return ComputeOrientedRectangleAABB(
		transformedRectangle);
}

CF_RectangleSourceData
TransformLocalBoundsToEffectSpace(
	const CF_Rect& localBounds,
	const CF_RectangleCoordinateContext& coordinateContext,
	const CF_LayerTransform2DContext& layerTransformContext)
{
	CF_RectangleSourceData sourceData;
	AEFX_CLR_STRUCT(sourceData);

	sourceData.isAvailable = FALSE;

	if (!coordinateContext.isValid ||
		!layerTransformContext.isValid) {
		return sourceData;
	}

	const CF_AffineTransform2D layerTransform =
		BuildLayerTransform2D(
			coordinateContext,
			layerTransformContext);

	const CF_OrientedRectangle localRectangle =
		BuildAxisAlignedOrientedRectangle(localBounds);

	const CF_OrientedRectangle transformedRectangle =
		TransformOrientedRectangle(
			localRectangle,
			layerTransform);

	const CF_Rect transformedBounds =
		ComputeOrientedRectangleAABB(
			transformedRectangle);

	if (!std::isfinite(transformedBounds.left) ||
		!std::isfinite(transformedBounds.top) ||
		!std::isfinite(transformedBounds.right) ||
		!std::isfinite(transformedBounds.bottom) ||
		transformedBounds.right < transformedBounds.left ||
		transformedBounds.bottom < transformedBounds.top) {
		return sourceData;
	}

	sourceData.bounds = localBounds;
	sourceData.layerTransform = layerTransform;
	sourceData.hasLayerTransform = TRUE;
	sourceData.isAvailable = TRUE;

	return sourceData;
}

CF_RectangleCoordinateContext
BuildRectangleCoordinateContext(
	A_long inputWidth,
	A_long inputHeight)
{
	CF_RectangleCoordinateContext coordinateContext;
	AEFX_CLR_STRUCT(coordinateContext);

	coordinateContext.inputWidth = inputWidth;
	coordinateContext.inputHeight = inputHeight;

	if (inputWidth <= 0 ||
		inputHeight <= 0) {
		return coordinateContext;
	}

	coordinateContext.originX =
		static_cast<PF_FpLong>(inputWidth) * 0.5;
	coordinateContext.originY =
		static_cast<PF_FpLong>(inputHeight) * 0.5;

	coordinateContext.isValid =
		std::isfinite(coordinateContext.originX) &&
		std::isfinite(coordinateContext.originY)
			? TRUE
			: FALSE;

	return coordinateContext;
}

CF_Rect
ConvertRectangleSnapshotToLocalBounds(
	const CF_RectangleGeometrySnapshot& snapshot)
{
	const PF_FpLong halfWidth =
		snapshot.sizeX * 0.5;

	const PF_FpLong halfHeight =
		snapshot.sizeY * 0.5;

	CF_Rect localBounds;
	localBounds.left =
		snapshot.positionX - halfWidth;
	localBounds.top =
		snapshot.positionY - halfHeight;
	localBounds.right =
		snapshot.positionX + halfWidth;
	localBounds.bottom =
		snapshot.positionY + halfHeight;

	return localBounds;
}

CF_RectangleSourceData
ConvertRectangleGeometrySnapshotToSourceData(
	const CF_RectangleGeometrySnapshot& snapshot,
	const CF_RectangleCoordinateContext& coordinateContext,
	const CF_LayerTransform2DContext& layerTransformContext)
{
	CF_RectangleSourceData sourceData;
	AEFX_CLR_STRUCT(sourceData);

	sourceData.isAvailable = FALSE;

	if (!ValidateRectangleGeometrySnapshot(snapshot) ||
		!coordinateContext.isValid ||
		!layerTransformContext.isValid) {
		return sourceData;
	}

	const CF_Rect localBounds =
		ConvertRectangleSnapshotToLocalBounds(snapshot);

	if (!std::isfinite(localBounds.left) ||
		!std::isfinite(localBounds.top) ||
		!std::isfinite(localBounds.right) ||
		!std::isfinite(localBounds.bottom) ||
		localBounds.right < localBounds.left ||
		localBounds.bottom < localBounds.top) {
		return sourceData;
	}

	return TransformLocalBoundsToEffectSpace(
		localBounds,
		coordinateContext,
		layerTransformContext);
}

CF_RectangleSourceData
SelectRectangleSourceData(
	A_Boolean snapshotSourceEnabled,
	const CF_RectangleSourceData& snapshotSource,
	const CF_RectangleSourceData& discoveredSource)
{
	CF_RectangleSourceData selectedSource;
	AEFX_CLR_STRUCT(selectedSource);

	selectedSource.isAvailable = FALSE;

	if (snapshotSourceEnabled == TRUE &&
		snapshotSource.isAvailable == TRUE) {
		return snapshotSource;
	}

	if (discoveredSource.isAvailable == TRUE) {
		return discoveredSource;
	}

	return selectedSource;
}

static CF_Rect
BuildTrimRectangle(
	const CornerFlexSettings& settings,
	PF_FpLong width,
	PF_FpLong height)
{
	CF_Rect rect;

	rect.left =
		width * (settings.trimLeft / 100.0);

	rect.top =
		height * (settings.trimTop / 100.0);

	rect.right =
		width -
		(width * (settings.trimRight / 100.0));

	rect.bottom =
		height -
		(height * (settings.trimBottom / 100.0));

	return rect;
}

/* Legacy Unique Stream ID locator retained only as historical reference.
   Runtime selection is now exclusively hierarchical. */
/* static const A_long CF_MAX_TARGET_STREAM_DEPTH = 32;

static A_Err
LocateGeometryTargetInStreamGroup(
	AEGP_DynamicStreamSuite4* dynamicStreamSuite,
	AEGP_StreamSuite6* streamSuite,
	AEGP_StreamRefH groupStreamH,
	const CF_GeometryTargetIdentity& targetIdentity,
	A_long depth,
	CF_GeometryTargetLocation& location)
{
	A_Err err = A_Err_NONE;

	if (!groupStreamH ||
		location.wasFound ||
		depth >= CF_MAX_TARGET_STREAM_DEPTH) {
		return err;
	}

	A_long streamCount = 0;

	err = dynamicStreamSuite->AEGP_GetNumStreamsInGroup(
		groupStreamH,
		&streamCount);

	for (A_long streamIndex = 0;
		!err &&
		!location.wasFound &&
		streamIndex < streamCount;
		streamIndex++) {

		AEGP_StreamRefH childStreamH = NULL;
		A_Err childErr = A_Err_NONE;

		childErr = dynamicStreamSuite->AEGP_GetNewStreamRefByIndex(
			S_cornerFlexPluginId,
			groupStreamH,
			streamIndex,
			&childStreamH);

		if (!childErr && childStreamH) {
			int32_t uniqueStreamId = 0;

			childErr = streamSuite->AEGP_GetUniqueStreamID(
				childStreamH,
				&uniqueStreamId);

			if (!childErr &&
				uniqueStreamId == targetIdentity.uniqueStreamId) {

				A_char matchName[AEGP_MAX_STREAM_MATCH_NAME_SIZE] = {};

				childErr = dynamicStreamSuite->AEGP_GetMatchName(
					childStreamH,
					matchName);

				if (!childErr) {
					location.wasFound = TRUE;
					location.uniqueStreamId = uniqueStreamId;

					// No Rectangle Path Match Name constant is exposed by this SDK.
					location.isRectanglePath = FALSE;
				}
			}

			if (!childErr && !location.wasFound) {
				AEGP_StreamGroupingType groupingType =
					AEGP_StreamGroupingType_NONE;

				childErr = dynamicStreamSuite->AEGP_GetStreamGroupingType(
					childStreamH,
					&groupingType);

				if (!childErr &&
					(groupingType == AEGP_StreamGroupingType_NAMED_GROUP ||
					 groupingType == AEGP_StreamGroupingType_INDEXED_GROUP)) {

					childErr = LocateGeometryTargetInStreamGroup(
						dynamicStreamSuite,
						streamSuite,
						childStreamH,
						targetIdentity,
						depth + 1,
						location);
				}
			}
		}

		if (childStreamH) {
			streamSuite->AEGP_DisposeStream(childStreamH);
		}

		static_cast<void>(childErr);
	}

	return err;
}

static CF_GeometryTargetLocation
LocateGeometryTargetInAfterEffects(
	PF_InData* in_data,
	const CF_GeometryTargetIdentity& targetIdentity)
{
	CF_GeometryTargetLocation location;
	AEFX_CLR_STRUCT(location);

	if (!targetIdentity.isValid ||
		!in_data ||
		!S_cornerFlexPluginId) {
		return location;
	}

	AEGP_StreamRefH rootStreamH = NULL;
	AEGP_PFInterfaceSuite1* pfInterfaceSuite = NULL;
	AEGP_LayerSuite9* layerSuite = NULL;
	AEGP_DynamicStreamSuite4* dynamicStreamSuite = NULL;
	AEGP_StreamSuite6* streamSuite = NULL;
	AEGP_SuiteHandler suites(in_data->pica_basicP);

	try {
		pfInterfaceSuite = suites.PFInterfaceSuite1();
		layerSuite = suites.LayerSuite9();
		dynamicStreamSuite = suites.DynamicStreamSuite4();
		streamSuite = suites.StreamSuite6();
	}
	catch (...) {
		return location;
	}

	AEGP_LayerH effectLayerH = NULL;
	AEGP_LayerIDVal effectLayerId = AEGP_LayerIDVal_NONE;

	A_Err err =
		pfInterfaceSuite->AEGP_GetEffectLayer(
			in_data->effect_ref,
			&effectLayerH);

	if (!err && effectLayerH) {
		err = layerSuite->AEGP_GetLayerID(
			effectLayerH,
			&effectLayerId);
	}

	if (!err &&
		effectLayerId == targetIdentity.layerId) {

		err = dynamicStreamSuite->AEGP_GetNewStreamRefForLayer(
			S_cornerFlexPluginId,
			effectLayerH,
			&rootStreamH);
	}

	if (!err && rootStreamH) {
		err = LocateGeometryTargetInStreamGroup(
			dynamicStreamSuite,
			streamSuite,
			rootStreamH,
			targetIdentity,
			0,
			location);
	}

	if (rootStreamH) {
		const A_Err disposeErr =
			streamSuite->AEGP_DisposeStream(rootStreamH);

		if (!err) {
			err = disposeErr;
		}
	}

	static_cast<void>(err);

	return location;
}
*/

static CF_RectanglePathProperties
ReadRectanglePathPropertiesFromAfterEffects(
	PF_InData* in_data,
	const CF_GeometryTargetIdentity& targetIdentity,
	const CF_GeometryTargetLocation& targetLocation)
{
	CF_RectanglePathProperties properties;
	AEFX_CLR_STRUCT(properties);

	const A_Boolean targetCanBeRead =
		in_data &&
		targetIdentity.isValid &&
		targetLocation.wasFound &&
		targetLocation.isRectanglePath &&
		targetLocation.uniqueStreamId ==
			targetIdentity.uniqueStreamId;

	properties.wasRead = FALSE;

	if (!targetCanBeRead) {
		return properties;
	}

	// The local SDK exposes no official Rectangle Path property Match Names.
	// Keep raw-property reading disabled instead of interpreting localized names or indices.

	return properties;
}

// After Effects integration boundary. Property selection is not reliable in Render.
static CF_RectangleSourceData
DiscoverRectangleSourceFromAfterEffects(
	PF_InData* in_data,
	const CF_GeometryTargetIdentity& targetIdentity)
{
	CF_RectangleSourceData rectangleSource;
	AEFX_CLR_STRUCT(rectangleSource);

	rectangleSource.isAvailable = FALSE;
	// Rectangle Source remains disabled. Runtime target selection is performed
	// by the hierarchical path resolver; Unique Stream ID is not a locator.
	static_cast<void>(in_data);
	static_cast<void>(targetIdentity);

	return rectangleSource;
}

static const A_char* const CF_VECTOR_GROUP_MATCH_NAME =
	"ADBE Vector Group";
static const A_char* const CF_VECTORS_GROUP_MATCH_NAME =
	"ADBE Vectors Group";
static const A_char* const CF_VECTOR_TRANSFORM_GROUP_MATCH_NAME =
	"ADBE Vector Transform Group";
static const A_char* const CF_VECTOR_ANCHOR_MATCH_NAME =
	"ADBE Vector Anchor";
static const A_char* const CF_VECTOR_POSITION_MATCH_NAME =
	"ADBE Vector Position";
static const A_char* const CF_VECTOR_SCALE_MATCH_NAME =
	"ADBE Vector Scale";
static const A_char* const CF_VECTOR_ROTATION_MATCH_NAME =
	"ADBE Vector Rotation";
static const A_char* const CF_VECTOR_SKEW_MATCH_NAME =
	"ADBE Vector Skew";

static A_Boolean
ReadGroupTwoDValue(
	AEGP_DynamicStreamSuite4* dynamicStreamSuite,
	AEGP_StreamSuite6* streamSuite,
	AEGP_StreamRefH transformGroupH,
	AEGP_PluginID pluginId,
	const A_char* matchName,
	const A_Time& compTime,
	PF_FpLong& valueX,
	PF_FpLong& valueY)
{
	AEGP_StreamRefH streamH = NULL;
	AEGP_StreamType streamType = AEGP_StreamType_NO_DATA;
	AEGP_StreamValue2 streamValue;
	AEFX_CLR_STRUCT(streamValue);

	A_Err err =
		dynamicStreamSuite->AEGP_GetNewStreamRefByMatchname(
			pluginId,
			transformGroupH,
			matchName,
			&streamH);

	if (!err) {
		err = streamSuite->AEGP_GetStreamType(
			streamH,
			&streamType);
	}

	if (!err &&
		(streamType == AEGP_StreamType_TwoD ||
		 streamType == AEGP_StreamType_TwoD_SPATIAL)) {
		err = streamSuite->AEGP_GetNewStreamValue(
			pluginId,
			streamH,
			AEGP_LTimeMode_CompTime,
			&compTime,
			FALSE,
			&streamValue);
	}

	if (!err) {
		valueX = streamValue.val.two_d.x;
		valueY = streamValue.val.two_d.y;
	}

	if (streamValue.streamH) {
		streamSuite->AEGP_DisposeStreamValue(&streamValue);
	}

	if (streamH) {
		streamSuite->AEGP_DisposeStream(streamH);
	}

	return !err &&
		std::isfinite(valueX) &&
		std::isfinite(valueY)
		? TRUE
		: FALSE;
}

static A_Boolean
ReadGroupOneDValue(
	AEGP_DynamicStreamSuite4* dynamicStreamSuite,
	AEGP_StreamSuite6* streamSuite,
	AEGP_StreamRefH transformGroupH,
	AEGP_PluginID pluginId,
	const A_char* matchName,
	const A_Time& compTime,
	PF_FpLong& value)
{
	AEGP_StreamRefH streamH = NULL;
	AEGP_StreamType streamType = AEGP_StreamType_NO_DATA;
	AEGP_StreamValue2 streamValue;
	AEFX_CLR_STRUCT(streamValue);

	A_Err err =
		dynamicStreamSuite->AEGP_GetNewStreamRefByMatchname(
			pluginId,
			transformGroupH,
			matchName,
			&streamH);

	if (!err) {
		err = streamSuite->AEGP_GetStreamType(
			streamH,
			&streamType);
	}

	if (!err && streamType == AEGP_StreamType_OneD) {
		err = streamSuite->AEGP_GetNewStreamValue(
			pluginId,
			streamH,
			AEGP_LTimeMode_CompTime,
			&compTime,
			FALSE,
			&streamValue);
	}

	if (!err) {
		value = streamValue.val.one_d;
	}

	if (streamValue.streamH) {
		streamSuite->AEGP_DisposeStreamValue(&streamValue);
	}

	if (streamH) {
		streamSuite->AEGP_DisposeStream(streamH);
	}

	return !err && std::isfinite(value) ? TRUE : FALSE;
}

static A_Boolean
ReadSingleGroupTransform(
	AEGP_DynamicStreamSuite4* dynamicStreamSuite,
	AEGP_StreamSuite6* streamSuite,
	AEGP_StreamRefH groupContentsH,
	AEGP_PluginID pluginId,
	const A_Time& compTime,
	CF_GroupTransform2DContext& context)
{
	AEGP_StreamRefH groupH = NULL;
	AEGP_StreamRefH grandParentH = NULL;
	AEGP_StreamRefH transformGroupH = NULL;
	A_char matchName[AEGP_MAX_STREAM_MATCH_NAME_SIZE] = {};

	A_Err err =
		dynamicStreamSuite->AEGP_GetNewParentStreamRef(
			pluginId,
			groupContentsH,
			&groupH);

	if (!err) {
		err = dynamicStreamSuite->AEGP_GetMatchName(
			groupH,
			matchName);
	}

	if (!err && strcmp(matchName, CF_VECTOR_GROUP_MATCH_NAME) == 0) {
		A_Err parentErr =
			dynamicStreamSuite->AEGP_GetNewParentStreamRef(
				pluginId,
				groupH,
				&grandParentH);

		if (!parentErr && grandParentH) {
			A_char grandMatchName[AEGP_MAX_STREAM_MATCH_NAME_SIZE] = {};
			parentErr = dynamicStreamSuite->AEGP_GetMatchName(
				grandParentH,
				grandMatchName);
			if (parentErr == A_Err_NONE &&
				strcmp(grandMatchName, CF_VECTOR_GROUP_MATCH_NAME) == 0) {
				context.isValid = FALSE;
				context.isUnsupported = TRUE;
				if (grandParentH) {
					streamSuite->AEGP_DisposeStream(grandParentH);
				}
				if (groupH) {
					streamSuite->AEGP_DisposeStream(groupH);
				}
				return FALSE;
			}
		}

		if (!err) {
			err = dynamicStreamSuite->AEGP_GetNewStreamRefByMatchname(
				pluginId,
				groupH,
				CF_VECTOR_TRANSFORM_GROUP_MATCH_NAME,
				&transformGroupH);
		}

		if (!err && transformGroupH) {
			context.isValid =
				ReadGroupTwoDValue(
					dynamicStreamSuite, streamSuite, transformGroupH,
					pluginId, CF_VECTOR_ANCHOR_MATCH_NAME, compTime,
					context.anchorX, context.anchorY) &&
				ReadGroupTwoDValue(
					dynamicStreamSuite, streamSuite, transformGroupH,
					pluginId, CF_VECTOR_POSITION_MATCH_NAME, compTime,
					context.positionX, context.positionY) &&
				ReadGroupTwoDValue(
					dynamicStreamSuite, streamSuite, transformGroupH,
					pluginId, CF_VECTOR_SCALE_MATCH_NAME, compTime,
					context.scaleX, context.scaleY) &&
				ReadGroupOneDValue(
					dynamicStreamSuite, streamSuite, transformGroupH,
					pluginId, CF_VECTOR_ROTATION_MATCH_NAME, compTime,
					context.rotationDegrees);

			if (!context.isValid) {
				context.isUnsupported = TRUE;
			}
			else {
				// AE exposes Shape Group Scale as percentages; the affine core uses normalized factors.
				context.scaleX /= 100.0;
				context.scaleY /= 100.0;
			}

			PF_FpLong skew = 0;
			if (context.isValid &&
				!ReadGroupOneDValue(
					dynamicStreamSuite, streamSuite, transformGroupH,
					pluginId, CF_VECTOR_SKEW_MATCH_NAME, compTime, skew)) {
				context.isValid = FALSE;
				context.isUnsupported = TRUE;
			}

			if (context.isValid &&
				(context.scaleX <= 0.0 || context.scaleY <= 0.0 ||
				 std::fabs(skew) > 1.0e-6)) {
				context.isValid = FALSE;
				context.isUnsupported = TRUE;
			}

			if (context.isValid) {
				const PF_FpLong radians =
					context.rotationDegrees *
					(3.14159265358979323846 / 180.0);
				const PF_FpLong c = std::cos(radians);
				const PF_FpLong s = std::sin(radians);
				context.transform = MakeIdentityAffineTransform2D();
				context.transform.a = c * context.scaleX;
				context.transform.b = s * context.scaleX;
				context.transform.c = -s * context.scaleY;
				context.transform.d = c * context.scaleY;
				context.transform.tx = context.positionX -
					((context.transform.a * context.anchorX) +
					 (context.transform.c * context.anchorY));
				context.transform.ty = context.positionY -
					((context.transform.b * context.anchorX) +
					 (context.transform.d * context.anchorY));
				context.hasGroupTransform = TRUE;
				context.isValid =
					std::isfinite(context.transform.a) &&
					std::isfinite(context.transform.b) &&
					std::isfinite(context.transform.c) &&
					std::isfinite(context.transform.d) &&
					std::isfinite(context.transform.tx) &&
					std::isfinite(context.transform.ty);
				if (!context.isValid) {
					context.isUnsupported = TRUE;
				}
			}
		}
	}

	if (transformGroupH) {
		streamSuite->AEGP_DisposeStream(transformGroupH);
	}
	if (grandParentH) {
		streamSuite->AEGP_DisposeStream(grandParentH);
	}
	if (groupH) {
		streamSuite->AEGP_DisposeStream(groupH);
	}

	return context.isValid;
}

/*
static A_Boolean
LocateSingleGroupForTargetInStreamGroup(
	AEGP_DynamicStreamSuite4* dynamicStreamSuite,
	AEGP_StreamSuite6* streamSuite,
	AEGP_StreamRefH groupStreamH,
	const CF_GeometryTargetIdentity& targetIdentity,
	const A_Time& compTime,
	A_long depth,
	CF_GroupTransform2DContext& context)
{
	if (!groupStreamH || depth >= CF_MAX_TARGET_STREAM_DEPTH) {
		return FALSE;
	}

	A_long streamCount = 0;
	if (dynamicStreamSuite->AEGP_GetNumStreamsInGroup(
		groupStreamH, &streamCount)) {
		return FALSE;
	}

	for (A_long streamIndex = 0;
		streamIndex < streamCount;
		streamIndex++) {
		AEGP_StreamRefH childStreamH = NULL;
		A_Err err = dynamicStreamSuite->AEGP_GetNewStreamRefByIndex(
			S_cornerFlexPluginId, groupStreamH, streamIndex, &childStreamH);
		if (err || !childStreamH) {
			continue;
		}

		int32_t uniqueStreamId = 0;
		AEGP_StreamGroupingType groupingType =
			AEGP_StreamGroupingType_NONE;
		dynamicStreamSuite->AEGP_GetStreamGroupingType(
			childStreamH, &groupingType);
		const A_Err uniqueIdErr =
			streamSuite->AEGP_GetUniqueStreamID(childStreamH, &uniqueStreamId);
		if (!uniqueIdErr &&
			uniqueStreamId == targetIdentity.uniqueStreamId) {
			const A_Boolean found =
				ReadSingleGroupTransform(
					dynamicStreamSuite,
					streamSuite,
					groupStreamH,
					S_cornerFlexPluginId,
					compTime,
					context);
			streamSuite->AEGP_DisposeStream(childStreamH);
			return found;
		}

		if (groupingType == AEGP_StreamGroupingType_NAMED_GROUP ||
			groupingType == AEGP_StreamGroupingType_INDEXED_GROUP) {
			if (LocateSingleGroupForTargetInStreamGroup(
				dynamicStreamSuite,
				streamSuite,
				childStreamH,
				targetIdentity,
				compTime,
				depth + 1,
				context)) {
				streamSuite->AEGP_DisposeStream(childStreamH);
			return TRUE;
			}
		}

		streamSuite->AEGP_DisposeStream(childStreamH);
	}

	return FALSE;
}
*/

CF_GroupTransform2DContext
ResolveSingleGroupTransformFromAfterEffects(
	PF_InData* in_data,
	const CF_GeometryTargetPath& targetPath)
{
	CF_GroupTransform2DContext context;
	AEFX_CLR_STRUCT(context);
	context.transform = MakeIdentityAffineTransform2D();
	context.isValid = FALSE;

	if (!in_data || !targetPath.isValid || !in_data->pica_basicP) {
		return context;
	}
	A_long vectorGroupCount = 0;
	for (A_long index = 0; index < targetPath.segmentCount; index++) {
		if (targetPath.segments[index].expectedMatchToken ==
			CF_MATCH_VECTOR_GROUP) {
			vectorGroupCount++;
		}
	}
	if (vectorGroupCount > 1) {
		context.isUnsupported = TRUE;
		return context;
	}

	AEGP_SuiteHandler suites(in_data->pica_basicP);
	AEGP_PFInterfaceSuite1* pfInterfaceSuite = NULL;
	AEGP_LayerSuite9* layerSuite = NULL;
	AEGP_DynamicStreamSuite4* dynamicStreamSuite = NULL;
	AEGP_StreamSuite6* streamSuite = NULL;
	try {
		pfInterfaceSuite = suites.PFInterfaceSuite1();
		layerSuite = suites.LayerSuite9();
		dynamicStreamSuite = suites.DynamicStreamSuite4();
		streamSuite = suites.StreamSuite6();
	}
	catch (...) {
		return context;
	}

	AEGP_StreamRefH rectangleStreamH = NULL;
	A_Time compTime;
	AEFX_CLR_STRUCT(compTime);

	A_Err err = A_Err_NONE;
	if (!err) {
		err = pfInterfaceSuite->AEGP_ConvertEffectToCompTime(
			in_data->effect_ref,
			in_data->current_time,
			in_data->time_scale,
			&compTime);
	}

	if (!err) {
		err = ResolveGeometryTargetPathStreamFromAfterEffects(
			in_data,
			targetPath,
			pfInterfaceSuite,
			layerSuite,
			dynamicStreamSuite,
			streamSuite,
			&rectangleStreamH);
	}

	if (!err && rectangleStreamH) {
		AEGP_StreamRefH vectorsGroupH = NULL;
		AEGP_StreamRefH vectorGroupH = NULL;
		A_char vectorsMatchName[AEGP_MAX_STREAM_MATCH_NAME_SIZE] = {};
		A_char vectorMatchName[AEGP_MAX_STREAM_MATCH_NAME_SIZE] = {};

		err = dynamicStreamSuite->AEGP_GetNewParentStreamRef(
			S_cornerFlexPluginId, rectangleStreamH, &vectorsGroupH);
		if (!err && vectorsGroupH) {
			err = dynamicStreamSuite->AEGP_GetMatchName(
				vectorsGroupH, vectorsMatchName);
		}
		if (!err && strcmp(vectorsMatchName, CF_VECTORS_GROUP_MATCH_NAME) != 0) {
			err = A_Err_GENERIC;
		}
		if (!err) {
			err = dynamicStreamSuite->AEGP_GetNewParentStreamRef(
				S_cornerFlexPluginId, vectorsGroupH, &vectorGroupH);
		}
		if (!err && vectorGroupH) {
			err = dynamicStreamSuite->AEGP_GetMatchName(
				vectorGroupH, vectorMatchName);
		}
		if (!err && strcmp(vectorMatchName, CF_VECTOR_GROUP_MATCH_NAME) == 0) {
			ReadSingleGroupTransform(
				dynamicStreamSuite,
				streamSuite,
				vectorsGroupH,
				S_cornerFlexPluginId,
				compTime,
				context);
		}
		else if (!err && strcmp(vectorMatchName,
			"ADBE Root Vectors Group") == 0) {
			// Rectangle directly under root Contents is a valid no-op.
			context.isValid = TRUE;
			context.hasGroupTransform = FALSE;
		}
		else if (!err) {
			err = A_Err_GENERIC;
		}

		if (vectorGroupH) {
			streamSuite->AEGP_DisposeStream(vectorGroupH);
		}
		if (vectorsGroupH) {
			streamSuite->AEGP_DisposeStream(vectorsGroupH);
		}
	}

	if (rectangleStreamH) {
		streamSuite->AEGP_DisposeStream(rectangleStreamH);
	}

	return context;
}

static A_Boolean
ReadLayerSpatialValue(
	AEGP_StreamSuite6* streamSuite,
	AEGP_LayerH layerH,
	AEGP_LayerStream layerStream,
	const A_Time& compTime,
	PF_FpLong& valueX,
	PF_FpLong& valueY)
{
	AEGP_StreamVal2 streamValue;
	AEFX_CLR_STRUCT(streamValue);

	AEGP_StreamType streamType =
		AEGP_StreamType_NO_DATA;

	const A_Err err =
		streamSuite->AEGP_GetLayerStreamValue(
			layerH,
			layerStream,
			AEGP_LTimeMode_CompTime,
			&compTime,
			FALSE,
			&streamValue,
			&streamType);

	if (err) {
		return FALSE;
	}

	if (streamType == AEGP_StreamType_ThreeD_SPATIAL ||
		streamType == AEGP_StreamType_ThreeD) {

		valueX = streamValue.three_d.x;
		valueY = streamValue.three_d.y;

	}
	else if (
		streamType == AEGP_StreamType_TwoD_SPATIAL ||
		streamType == AEGP_StreamType_TwoD) {

		valueX = streamValue.two_d.x;
		valueY = streamValue.two_d.y;

	}
	else {
		return FALSE;
	}

	return std::isfinite(valueX) &&
		std::isfinite(valueY)
			? TRUE
			: FALSE;
}

static CF_LayerTransform2DContext
ResolveLayerTransform2DFromAfterEffects(
	PF_InData* in_data)
{
	CF_LayerTransform2DContext transformContext;
	AEFX_CLR_STRUCT(transformContext);

	transformContext.isValid = FALSE;

	if (!in_data ||
		!in_data->effect_ref ||
		!in_data->pica_basicP ||
		in_data->downsample_x.den == 0 ||
		in_data->downsample_y.den == 0 ||
		in_data->downsample_x.num !=
			static_cast<A_long>(in_data->downsample_x.den) ||
		in_data->downsample_y.num !=
			static_cast<A_long>(in_data->downsample_y.den) ||
		in_data->output_origin_x != 0 ||
		in_data->output_origin_y != 0 ||
		in_data->pre_effect_source_origin_x != 0 ||
		in_data->pre_effect_source_origin_y != 0) {

		return transformContext;
	}

	AEGP_PFInterfaceSuite1* pfInterfaceSuite = NULL;
	AEGP_LayerSuite9* layerSuite = NULL;
	AEGP_CompSuite12* compSuite = NULL;
	AEGP_ItemSuite9* itemSuite = NULL;
	AEGP_StreamSuite6* streamSuite = NULL;

	AEGP_SuiteHandler suites(in_data->pica_basicP);

	try {
		pfInterfaceSuite = suites.PFInterfaceSuite1();
		layerSuite = suites.LayerSuite9();
		compSuite = suites.CompSuite12();
		itemSuite = suites.ItemSuite9();
		streamSuite = suites.StreamSuite6();
	}
	catch (...) {
		return transformContext;
	}

	AEGP_LayerH effectLayerH = NULL;
	AEGP_LayerH parentLayerH = NULL;
	AEGP_CompH compH = NULL;
	AEGP_ItemH compItemH = NULL;
	A_Boolean isLayer3D = FALSE;
	A_Time compTime;
	AEFX_CLR_STRUCT(compTime);

	A_Err err =
		pfInterfaceSuite->AEGP_GetEffectLayer(
			in_data->effect_ref,
			&effectLayerH);

	if (err || !effectLayerH) {
		return transformContext;
	}

	err = layerSuite->AEGP_IsLayer3D(
		effectLayerH,
		&isLayer3D);

	if (err || isLayer3D) {
		return transformContext;
	}

	err = layerSuite->AEGP_GetLayerParent(
		effectLayerH,
		&parentLayerH);

	if (err || parentLayerH) {
		return transformContext;
	}

	err = layerSuite->AEGP_GetLayerParentComp(
		effectLayerH,
		&compH);

	if (err || !compH) {
		return transformContext;
	}

	err = compSuite->AEGP_GetItemFromComp(
		compH,
		&compItemH);

	if (err || !compItemH) {
		return transformContext;
	}

	err = itemSuite->AEGP_GetItemDimensions(
		compItemH,
		&transformContext.compWidth,
		&transformContext.compHeight);

	if (err) {
		return transformContext;
	}

	err = pfInterfaceSuite->AEGP_ConvertEffectToCompTime(
		in_data->effect_ref,
		in_data->current_time,
		in_data->time_scale,
		&compTime);

	PF_FpLong scalePercentX = 0;
	PF_FpLong scalePercentY = 0;

	if (!err &&
		!ReadLayerSpatialValue(
			streamSuite,
			effectLayerH,
			AEGP_LayerStream_ANCHORPOINT,
			compTime,
			transformContext.anchorX,
			transformContext.anchorY)) {

		err = A_Err_GENERIC;
	}

	if (!err &&
		!ReadLayerSpatialValue(
			streamSuite,
			effectLayerH,
			AEGP_LayerStream_POSITION,
			compTime,
			transformContext.positionX,
			transformContext.positionY)) {

		err = A_Err_GENERIC;
	}

	if (!err &&
		!ReadLayerSpatialValue(
			streamSuite,
			effectLayerH,
			AEGP_LayerStream_SCALE,
			compTime,
			scalePercentX,
			scalePercentY)) {

		err = A_Err_GENERIC;
	}

	transformContext.scaleX =
		scalePercentX / 100.0;

	transformContext.scaleY =
		scalePercentY / 100.0;

	AEGP_StreamVal2 rotationValue;
	AEFX_CLR_STRUCT(rotationValue);

	AEGP_StreamType rotationType =
		AEGP_StreamType_NO_DATA;

	if (!err) {
		err = streamSuite->AEGP_GetLayerStreamValue(
			effectLayerH,
			AEGP_LayerStream_ROTATION,
			AEGP_LTimeMode_CompTime,
			&compTime,
			FALSE,
			&rotationValue,
			&rotationType);
	}

	const A_Boolean supportedTransform =
		!err &&
		transformContext.compWidth > 0 &&
		transformContext.compHeight > 0 &&
		std::isfinite(transformContext.scaleX) &&
		std::isfinite(transformContext.scaleY) &&
		transformContext.scaleX > 0.0 &&
		transformContext.scaleY > 0.0 &&
		rotationType == AEGP_StreamType_OneD &&
		std::isfinite(rotationValue.one_d);

	if (!supportedTransform) {
		return transformContext;
	}

	transformContext.rotationDegrees =
		rotationValue.one_d;

	transformContext.translationX =
		transformContext.positionX -
		(static_cast<PF_FpLong>(
			transformContext.compWidth) * 0.5);

	transformContext.translationY =
		transformContext.positionY -
		(static_cast<PF_FpLong>(
			transformContext.compHeight) * 0.5);

	transformContext.isValid =
		std::isfinite(transformContext.translationX) &&
		std::isfinite(transformContext.translationY)
			? TRUE
			: FALSE;

	return transformContext;
}

CF_GeometrySourceData
ResolveLayerBoundsGeometry(
	A_long inputWidth,
	A_long inputHeight)
{
	CF_GeometrySourceData sourceData;
	AEFX_CLR_STRUCT(sourceData);

	sourceData.bounds.left = 0;
	sourceData.bounds.top = 0;
	sourceData.bounds.right = inputWidth;
	sourceData.bounds.bottom = inputHeight;

	sourceData.source =
		CF_GEOMETRY_SOURCE_LAYER_BOUNDS;

	sourceData.primitiveType =
		CF_PRIMITIVE_UNKNOWN;

	sourceData.isFallback = TRUE;

	return sourceData;
}

CF_GeometrySourceData
ResolveRectangleGeometry(
	const CF_RectangleSourceData& rectangleSource)
{
	CF_GeometrySourceData sourceData;
	AEFX_CLR_STRUCT(sourceData);

	sourceData.bounds =
		rectangleSource.bounds;

	sourceData.layerTransform =
		rectangleSource.layerTransform;

	sourceData.groupTransform =
		rectangleSource.groupTransform;

	sourceData.hasLayerTransform =
		rectangleSource.hasLayerTransform;

	sourceData.hasGroupTransform =
		rectangleSource.hasGroupTransform;

	sourceData.source =
		CF_GEOMETRY_SOURCE_RECTANGLE;

	sourceData.primitiveType =
		CF_PRIMITIVE_RECTANGLE;

	sourceData.isFallback = FALSE;

	return sourceData;
}

CF_GeometrySourceData
ResolveGeometrySource(
	const CF_GeometryResolveRequest& request)
{
	if (request.rectangleSource.isAvailable) {
		CF_GeometrySourceData sourceData =
			ResolveRectangleGeometry(
			request.rectangleSource);

		sourceData.groupTransform =
			request.groupTransform;
		sourceData.hasGroupTransform =
			request.hasGroupTransform;

		return sourceData;
	}

	return ResolveLayerBoundsGeometry(
		request.inputWidth,
		request.inputHeight);
}

CF_RectangleGeometry
BuildRectangleGeometry(
	const CF_Rect& bounds)
{
	CF_RectangleGeometry rectangleGeometry;

	rectangleGeometry.bounds = bounds;

	rectangleGeometry.width =
		bounds.right - bounds.left;

	rectangleGeometry.height =
		bounds.bottom - bounds.top;

	rectangleGeometry.centerX =
		bounds.left +
		(rectangleGeometry.width / 2.0);

	rectangleGeometry.centerY =
		bounds.top +
		(rectangleGeometry.height / 2.0);

	return rectangleGeometry;
}

CF_Vector2
TransformPoint2D(
	const CF_AffineTransform2D& transform,
	const CF_Vector2& point)
{
	CF_Vector2 transformedPoint;

	transformedPoint.x =
		(transform.a * point.x) +
		(transform.c * point.y) +
		transform.tx;

	transformedPoint.y =
		(transform.b * point.x) +
		(transform.d * point.y) +
		transform.ty;

	return transformedPoint;
}

PF_FpLong
DotVector2(
	const CF_Vector2& a,
	const CF_Vector2& b)
{
	return (a.x * b.x) + (a.y * b.y);
}

PF_FpLong
LengthVector2(
	const CF_Vector2& vector)
{
	return std::sqrt(DotVector2(vector, vector));
}

CF_Vector2
NormalizeVector2(
	const CF_Vector2& vector)
{
	CF_Vector2 normalizedVector;
	AEFX_CLR_STRUCT(normalizedVector);

	const PF_FpLong length =
		LengthVector2(vector);

	if (length <= 0.0 ||
		!std::isfinite(length)) {
		return normalizedVector;
	}

	normalizedVector.x =
		vector.x / length;

	normalizedVector.y =
		vector.y / length;

	return normalizedVector;
}

CF_AffineTransform2D
MakeIdentityAffineTransform2D()
{
	CF_AffineTransform2D transform;
	AEFX_CLR_STRUCT(transform);

	transform.a = 1.0;
	transform.d = 1.0;

	return transform;
}

CF_AffineTransform2D
ComposeAffineTransform2D(
	const CF_AffineTransform2D& parent,
	const CF_AffineTransform2D& child)
{
	CF_AffineTransform2D result;
	AEFX_CLR_STRUCT(result);

	// result = parent * child: apply child first, then parent.
	result.a =
		(parent.a * child.a) +
		(parent.c * child.b);
	result.b =
		(parent.b * child.a) +
		(parent.d * child.b);
	result.c =
		(parent.a * child.c) +
		(parent.c * child.d);
	result.d =
		(parent.b * child.c) +
		(parent.d * child.d);
	result.tx =
		(parent.a * child.tx) +
		(parent.c * child.ty) +
		parent.tx;
	result.ty =
		(parent.b * child.tx) +
		(parent.d * child.ty) +
		parent.ty;

	return result;
}

CF_AffineTransform2D
BuildLayerTransform2D(
	const CF_RectangleCoordinateContext& coordinateContext,
	const CF_LayerTransform2DContext& layerTransformContext)
{
	CF_AffineTransform2D transform =
		MakeIdentityAffineTransform2D();

	if (!coordinateContext.isValid ||
		!layerTransformContext.isValid) {
		return transform;
	}

	const PF_FpLong radians =
		layerTransformContext.rotationDegrees *
		(3.14159265358979323846 / 180.0);

	const PF_FpLong cosRotation =
		std::cos(radians);

	const PF_FpLong sinRotation =
		std::sin(radians);

	transform.a =
		cosRotation *
		layerTransformContext.scaleX;

	transform.b =
		sinRotation *
		layerTransformContext.scaleX;

	transform.c =
		-sinRotation *
		layerTransformContext.scaleY;

	transform.d =
		cosRotation *
		layerTransformContext.scaleY;

	transform.tx =
		coordinateContext.originX +
		layerTransformContext.translationX -
		((transform.a * layerTransformContext.anchorX) +
			(transform.c * layerTransformContext.anchorY));

	transform.ty =
		coordinateContext.originY +
		layerTransformContext.translationY -
		((transform.b * layerTransformContext.anchorX) +
			(transform.d * layerTransformContext.anchorY));

	return transform;
}

CF_OrientedRectangle
BuildAxisAlignedOrientedRectangle(
	const CF_Rect& bounds)
{
	CF_OrientedRectangle rectangle;
	AEFX_CLR_STRUCT(rectangle);

	const PF_FpLong width =
		bounds.right - bounds.left;

	const PF_FpLong height =
		bounds.bottom - bounds.top;

	rectangle.center.x =
		bounds.left + (width * 0.5);

	rectangle.center.y =
		bounds.top + (height * 0.5);

	rectangle.axisX.x = 1.0;
	rectangle.axisX.y = 0.0;

	rectangle.axisY.x = 0.0;
	rectangle.axisY.y = 1.0;

	rectangle.halfWidth =
		width * 0.5;

	rectangle.halfHeight =
		height * 0.5;

	return rectangle;
}

CF_OrientedRectangle
TransformOrientedRectangle(
	const CF_OrientedRectangle& rectangle,
	const CF_AffineTransform2D& transform)
{
	CF_OrientedRectangle transformedRectangle;
	AEFX_CLR_STRUCT(transformedRectangle);

	transformedRectangle.center =
		TransformPoint2D(
			transform,
			rectangle.center);

	transformedRectangle.axisX.x =
		(transform.a * rectangle.axisX.x) +
		(transform.c * rectangle.axisX.y);

	transformedRectangle.axisX.y =
		(transform.b * rectangle.axisX.x) +
		(transform.d * rectangle.axisX.y);

	transformedRectangle.axisY.x =
		(transform.a * rectangle.axisY.x) +
		(transform.c * rectangle.axisY.y);

	transformedRectangle.axisY.y =
		(transform.b * rectangle.axisY.x) +
		(transform.d * rectangle.axisY.y);

	const PF_FpLong axisXLength =
		LengthVector2(transformedRectangle.axisX);

	const PF_FpLong axisYLength =
		LengthVector2(transformedRectangle.axisY);

	transformedRectangle.axisX =
		NormalizeVector2(transformedRectangle.axisX);

	transformedRectangle.axisY =
		NormalizeVector2(transformedRectangle.axisY);

	transformedRectangle.halfWidth =
		rectangle.halfWidth * axisXLength;

	transformedRectangle.halfHeight =
		rectangle.halfHeight * axisYLength;

	return transformedRectangle;
}

CF_Rect
ComputeOrientedRectangleAABB(
	const CF_OrientedRectangle& rectangle)
{
	const CF_Vector2 xExtent = {
		rectangle.axisX.x * rectangle.halfWidth,
		rectangle.axisX.y * rectangle.halfWidth
	};

	const CF_Vector2 yExtent = {
		rectangle.axisY.x * rectangle.halfHeight,
		rectangle.axisY.y * rectangle.halfHeight
	};

	const CF_Vector2 p0 = {
		rectangle.center.x - xExtent.x - yExtent.x,
		rectangle.center.y - xExtent.y - yExtent.y
	};

	const CF_Vector2 p1 = {
		rectangle.center.x + xExtent.x - yExtent.x,
		rectangle.center.y + xExtent.y - yExtent.y
	};

	const CF_Vector2 p2 = {
		rectangle.center.x + xExtent.x + yExtent.x,
		rectangle.center.y + xExtent.y + yExtent.y
	};

	const CF_Vector2 p3 = {
		rectangle.center.x - xExtent.x + yExtent.x,
		rectangle.center.y - xExtent.y + yExtent.y
	};

	CF_Rect aabb;
	aabb.left =
		MinFpLong(
			MinFpLong(p0.x, p1.x),
			MinFpLong(p2.x, p3.x));

	aabb.top =
		MinFpLong(
			MinFpLong(p0.y, p1.y),
			MinFpLong(p2.y, p3.y));

	aabb.right =
		MaxFpLong(
			MaxFpLong(p0.x, p1.x),
			MaxFpLong(p2.x, p3.x));

	aabb.bottom =
		MaxFpLong(
			MaxFpLong(p0.y, p1.y),
			MaxFpLong(p2.y, p3.y));

	return aabb;
}

static const PF_FpLong CF_AFFINE_DETERMINANT_EPSILON =
	1.0e-12;

static A_Boolean
IsFiniteAffineRectangle(
	const CF_AffineRectangle& rectangle)
{
	return std::isfinite(rectangle.center.x) &&
		std::isfinite(rectangle.center.y) &&
		std::isfinite(rectangle.basisX.x) &&
		std::isfinite(rectangle.basisX.y) &&
		std::isfinite(rectangle.basisY.x) &&
		std::isfinite(rectangle.basisY.y) &&
		std::isfinite(rectangle.halfWidth) &&
		std::isfinite(rectangle.halfHeight) &&
		rectangle.halfWidth >= 0.0 &&
		rectangle.halfHeight >= 0.0;
}

static PF_FpLong
AffineRectangleDeterminant(
	const CF_AffineRectangle& rectangle)
{
	return (rectangle.basisX.x * rectangle.basisY.y) -
		(rectangle.basisY.x * rectangle.basisX.y);
}

static A_Boolean
IsInvertibleAffineRectangle(
	const CF_AffineRectangle& rectangle)
{
	const PF_FpLong determinant =
		AffineRectangleDeterminant(rectangle);

	return IsFiniteAffineRectangle(rectangle) &&
		std::isfinite(determinant) &&
		std::fabs(determinant) >
			CF_AFFINE_DETERMINANT_EPSILON;
}

CF_AffineRectangle
BuildAxisAlignedAffineRectangle(
	const CF_Rect& bounds)
{
	CF_AffineRectangle rectangle;
	AEFX_CLR_STRUCT(rectangle);

	const PF_FpLong width =
		bounds.right - bounds.left;
	const PF_FpLong height =
		bounds.bottom - bounds.top;

	if (!std::isfinite(bounds.left) ||
		!std::isfinite(bounds.top) ||
		!std::isfinite(bounds.right) ||
		!std::isfinite(bounds.bottom) ||
		width < 0.0 ||
		height < 0.0) {
		return rectangle;
	}

	rectangle.center.x =
		bounds.left + (width * 0.5);
	rectangle.center.y =
		bounds.top + (height * 0.5);
	rectangle.basisX.x = 1.0;
	rectangle.basisY.y = 1.0;
	rectangle.halfWidth = width * 0.5;
	rectangle.halfHeight = height * 0.5;

	return rectangle;
}

CF_AffineRectangle
TransformAffineRectangle(
	const CF_AffineRectangle& rectangle,
	const CF_AffineTransform2D& transform)
{
	CF_AffineRectangle transformedRectangle;
	AEFX_CLR_STRUCT(transformedRectangle);

	if (!IsFiniteAffineRectangle(rectangle) ||
		!std::isfinite(transform.a) ||
		!std::isfinite(transform.b) ||
		!std::isfinite(transform.c) ||
		!std::isfinite(transform.d) ||
		!std::isfinite(transform.tx) ||
		!std::isfinite(transform.ty)) {
		return transformedRectangle;
	}

	transformedRectangle.center =
		TransformPoint2D(transform, rectangle.center);

	transformedRectangle.basisX.x =
		(transform.a * rectangle.basisX.x) +
		(transform.c * rectangle.basisX.y);
	transformedRectangle.basisX.y =
		(transform.b * rectangle.basisX.x) +
		(transform.d * rectangle.basisX.y);
	transformedRectangle.basisY.x =
		(transform.a * rectangle.basisY.x) +
		(transform.c * rectangle.basisY.y);
	transformedRectangle.basisY.y =
		(transform.b * rectangle.basisY.x) +
		(transform.d * rectangle.basisY.y);
	transformedRectangle.halfWidth = rectangle.halfWidth;
	transformedRectangle.halfHeight = rectangle.halfHeight;

	return IsFiniteAffineRectangle(transformedRectangle)
		? transformedRectangle
		: CF_AffineRectangle{};
}

CF_Rect
ComputeAffineRectangleAABB(
	const CF_AffineRectangle& rectangle)
{
	CF_Rect aabb;
	AEFX_CLR_STRUCT(aabb);

	if (!IsFiniteAffineRectangle(rectangle)) {
		return aabb;
	}

	const CF_Vector2 xExtent = {
		rectangle.basisX.x * rectangle.halfWidth,
		rectangle.basisX.y * rectangle.halfWidth
	};
	const CF_Vector2 yExtent = {
		rectangle.basisY.x * rectangle.halfHeight,
		rectangle.basisY.y * rectangle.halfHeight
	};
	const CF_Vector2 points[4] = {
		{ rectangle.center.x - xExtent.x - yExtent.x,
		  rectangle.center.y - xExtent.y - yExtent.y },
		{ rectangle.center.x + xExtent.x - yExtent.x,
		  rectangle.center.y + xExtent.y - yExtent.y },
		{ rectangle.center.x + xExtent.x + yExtent.x,
		  rectangle.center.y + xExtent.y + yExtent.y },
		{ rectangle.center.x - xExtent.x + yExtent.x,
		  rectangle.center.y - xExtent.y + yExtent.y }
	};

	aabb.left = points[0].x;
	aabb.top = points[0].y;
	aabb.right = points[0].x;
	aabb.bottom = points[0].y;

	for (A_long pointIndex = 1; pointIndex < 4; pointIndex++) {
		aabb.left = MinFpLong(aabb.left, points[pointIndex].x);
		aabb.top = MinFpLong(aabb.top, points[pointIndex].y);
		aabb.right = MaxFpLong(aabb.right, points[pointIndex].x);
		aabb.bottom = MaxFpLong(aabb.bottom, points[pointIndex].y);
	}

	return aabb;
}

A_Boolean
IsPointInsideAffineRectangle(
	const CF_AffineRectangle& rectangle,
	PF_FpLong x,
	PF_FpLong y)
{
	if (!IsInvertibleAffineRectangle(rectangle) ||
		!std::isfinite(x) ||
		!std::isfinite(y)) {
		return FALSE;
	}

	const PF_FpLong determinant =
		AffineRectangleDeterminant(rectangle);
	const PF_FpLong deltaX = x - rectangle.center.x;
	const PF_FpLong deltaY = y - rectangle.center.y;
	const PF_FpLong localX =
		((rectangle.basisY.y * deltaX) -
			(rectangle.basisY.x * deltaY)) /
		determinant;
	const PF_FpLong localY =
		((-rectangle.basisX.y * deltaX) +
			(rectangle.basisX.x * deltaY)) /
		determinant;
	const PF_FpLong tolerance = 1.0e-9;

	return std::isfinite(localX) &&
		std::isfinite(localY) &&
		std::fabs(localX) <= rectangle.halfWidth + tolerance &&
		std::fabs(localY) <= rectangle.halfHeight + tolerance
			? TRUE
			: FALSE;
}

A_Boolean
IsPointInsideOrientedRectangle(
	const CF_OrientedRectangle& rectangle,
	PF_FpLong x,
	PF_FpLong y)
{
	const CF_Vector2 pointDelta = {
		x - rectangle.center.x,
		y - rectangle.center.y
	};

	const PF_FpLong localX =
		DotVector2(pointDelta, rectangle.axisX);

	const PF_FpLong localY =
		DotVector2(pointDelta, rectangle.axisY);

	const PF_FpLong epsilon = 0.000001;

	return std::fabs(localX) <= rectangle.halfWidth + epsilon &&
		std::fabs(localY) <= rectangle.halfHeight + epsilon
			? TRUE
			: FALSE;
}

static CF_GeometryContext
BuildGeometryContext(
	const CF_GeometrySourceData& sourceData)
{
	CF_GeometryContext geometryContext;
	AEFX_CLR_STRUCT(geometryContext);

	geometryContext.rectangleGeometry =
		BuildRectangleGeometry(sourceData.bounds);

	geometryContext.geometryBounds =
		geometryContext.rectangleGeometry.bounds;

	geometryContext.layerTransform =
		sourceData.layerTransform;

	geometryContext.groupTransform =
		sourceData.groupTransform;

	geometryContext.cornerRadii.topLeft = 0;
	geometryContext.cornerRadii.topRight = 0;
	geometryContext.cornerRadii.bottomRight = 0;
	geometryContext.cornerRadii.bottomLeft = 0;

	geometryContext.source =
		sourceData.source;

	geometryContext.primitiveType =
		sourceData.primitiveType;

	geometryContext.hasLayerTransform =
		sourceData.hasLayerTransform;

	geometryContext.hasGroupTransform =
		sourceData.hasGroupTransform;

	geometryContext.isFallback =
		sourceData.isFallback;

	return geometryContext;
}

A_Boolean
IsGeometryContextValid(
	const CF_GeometryContext& geometryContext)
{
	const CF_Rect& bounds =
		geometryContext.geometryBounds;

	const PF_FpLong width =
		bounds.right - bounds.left;

	const PF_FpLong height =
		bounds.bottom - bounds.top;

	const A_Boolean orderedBounds =
		bounds.left <= bounds.right &&
		bounds.top <= bounds.bottom;

	const A_Boolean nonNegativeSize =
		width >= 0 &&
		height >= 0;

	return orderedBounds && nonNegativeSize;
}

CF_GeometryContext
ExecuteTrimOperation(
	CF_GeometryContext geometryContext,
	const CornerFlexSettings& settings)
{
	const CF_Rect baseBounds =
		geometryContext.geometryBounds;

	const PF_FpLong geometryWidth =
		baseBounds.right - baseBounds.left;

	const PF_FpLong geometryHeight =
		baseBounds.bottom - baseBounds.top;

	const CF_Rect localTrimBounds =
		BuildTrimRectangle(
			settings,
			geometryWidth,
			geometryHeight);

	geometryContext.geometryBounds.left =
		baseBounds.left + localTrimBounds.left;
	geometryContext.geometryBounds.top =
		baseBounds.top + localTrimBounds.top;
	geometryContext.geometryBounds.right =
		baseBounds.left + localTrimBounds.right;
	geometryContext.geometryBounds.bottom =
		baseBounds.top + localTrimBounds.bottom;

	return geometryContext;
}

CF_GeometryContext
ExecuteGeometryPipeline(
	CF_GeometryContext geometryContext,
	const CornerFlexSettings& settings)
{
	CF_GeometryContext pipelineGeometry =
		geometryContext;

	// Operation 1: Trim.
	pipelineGeometry =
		ExecuteTrimOperation(
			pipelineGeometry,
			settings);

	// Future operation slots: Radius, Chamfer, Offset.

	return pipelineGeometry;
}

CF_RenderContext
BuildRenderContext(
	const CF_GeometryContext& geometryContext,
	A_long inputWidth,
	A_long inputHeight)
{
	CF_RenderContext renderContext;
	AEFX_CLR_STRUCT(renderContext);

	renderContext.geometryBounds =
		geometryContext.geometryBounds;

	if (geometryContext.source == CF_GEOMETRY_SOURCE_RECTANGLE &&
		geometryContext.primitiveType == CF_PRIMITIVE_RECTANGLE &&
		geometryContext.hasLayerTransform) {
		CF_AffineTransform2D combinedTransform =
			geometryContext.layerTransform;

		if (geometryContext.hasGroupTransform) {
			combinedTransform =
				ComposeAffineTransform2D(
					geometryContext.layerTransform,
					geometryContext.groupTransform);
		}

		if (geometryContext.hasGroupTransform) {
			const CF_AffineRectangle localRectangle =
				BuildAxisAlignedAffineRectangle(
					geometryContext.geometryBounds);

			renderContext.affineRect =
				TransformAffineRectangle(
					localRectangle,
					combinedTransform);

			renderContext.geometryBounds =
				ComputeAffineRectangleAABB(
					renderContext.affineRect);

			renderContext.hasAffineRect =
			IsPointInsideAffineRectangle(
				renderContext.affineRect,
				renderContext.affineRect.center.x,
				renderContext.affineRect.center.y);
		}
		else {
			const CF_OrientedRectangle localRectangle =
				BuildAxisAlignedOrientedRectangle(
					geometryContext.geometryBounds);

			renderContext.orientedRect =
				TransformOrientedRectangle(
					localRectangle,
					combinedTransform);

			renderContext.geometryBounds =
				ComputeOrientedRectangleAABB(
					renderContext.orientedRect);

			renderContext.hasOrientedRect = TRUE;
		}
	}

	renderContext.groupTransform =
		geometryContext.groupTransform;
	renderContext.hasGroupTransform =
		geometryContext.hasGroupTransform;

	renderContext.inputWidth = inputWidth;
	renderContext.inputHeight = inputHeight;

	return renderContext;
}

static PF_Err
Render(
	PF_InData* in_data,
	PF_OutData* out_data,
	PF_ParamDef* params[],
	PF_LayerDef* output)
{
	PF_Err err = PF_Err_NONE;

	AEGP_SuiteHandler suites(in_data->pica_basicP);

	CornerFlexSettings settings;
	ReadCornerFlexSettings(params, settings);

	const CF_RectangleGeometrySnapshot rectangleSnapshot =
		ReadRectangleGeometrySnapshot(params);

	const A_Boolean snapshotSourceEnabled =
		IsRectangleSnapshotSourceEnabled(params);

	const A_long inputWidth =
		params[CORNERFLEX_INPUT]->u.ld.width;

	const A_long inputHeight =
		params[CORNERFLEX_INPUT]->u.ld.height;

	const CF_GeometryTargetState storedTargetState =
		ReadGeometryTargetState(params);

	const CF_GeometryTargetIdentity targetIdentity =
		GetActiveGeometryTargetIdentity(
			storedTargetState);

	const CF_GeometryTargetPath targetPath =
		ReadGeometryTargetPath(params);
	CF_GeometryTargetResolutionDiagnostic targetResolutionDiagnostic;
	const CF_GeometryTargetLocation targetPathLocation =
		ResolveGeometryTargetPathFromAfterEffects(
			in_data,
			targetPath,
			&targetResolutionDiagnostic);
	// Phase 5.13C.1 only validates identity; Group Transform remains gated.
	static_cast<void>(targetPathLocation);
	static_cast<void>(targetResolutionDiagnostic);

	const CF_RectangleCoordinateContext coordinateContext =
		BuildRectangleCoordinateContext(
			inputWidth,
			inputHeight);

	CF_LayerTransform2DContext layerTransformContext;
	AEFX_CLR_STRUCT(layerTransformContext);

	layerTransformContext.isValid = FALSE;

	if (snapshotSourceEnabled) {
		layerTransformContext =
			ResolveLayerTransform2DFromAfterEffects(
				in_data);
	}

	CF_RectangleSourceData convertedRectangleSource =
		ConvertRectangleGeometrySnapshotToSourceData(
			rectangleSnapshot,
			coordinateContext,
			layerTransformContext);

	CF_GroupTransform2DContext groupTransformContext;
	AEFX_CLR_STRUCT(groupTransformContext);
	groupTransformContext.transform =
		MakeIdentityAffineTransform2D();
	groupTransformContext.isValid = FALSE;

	// Activate only the fully resolved, single-group target path.
	if (snapshotSourceEnabled &&
		targetPathLocation.wasFound &&
		targetPathLocation.isRectanglePath) {
		groupTransformContext =
			ResolveSingleGroupTransformFromAfterEffects(
				in_data,
				targetPath);
	}

	CF_GeometryResolveRequest resolveRequest;
	AEFX_CLR_STRUCT(resolveRequest);

	resolveRequest.inputWidth = inputWidth;
	resolveRequest.inputHeight = inputHeight;

	const CF_RectangleSourceData discoveredRectangleSource =
		DiscoverRectangleSourceFromAfterEffects(
			in_data,
			targetIdentity);

	const CF_RectangleSourceData selectedRectangleSource =
		SelectRectangleSourceData(
			snapshotSourceEnabled,
			convertedRectangleSource,
			discoveredRectangleSource);

	// First activation point where an enabled snapshot can modify geometryBounds.
	resolveRequest.rectangleSource =
		selectedRectangleSource;
	resolveRequest.groupTransform =
		groupTransformContext.transform;
	resolveRequest.hasGroupTransform =
		groupTransformContext.isValid &&
		groupTransformContext.hasGroupTransform;

	const CF_GeometrySourceData sourceData =
		ResolveGeometrySource(resolveRequest);

	CF_GeometryContext geometryContext =
		BuildGeometryContext(sourceData);

	const A_Boolean baseGeometryIsValid =
		IsGeometryContextValid(geometryContext);

	geometryContext =
		ExecuteGeometryPipeline(
			geometryContext,
			settings);

	const A_Boolean pipelineGeometryIsValid =
		IsGeometryContextValid(geometryContext);

	// Validation remains observational until an explicit SDK error policy is defined.
	static_cast<void>(baseGeometryIsValid);
	static_cast<void>(pipelineGeometryIsValid);

	CF_RenderContext context =
		BuildRenderContext(
			geometryContext,
			inputWidth,
			inputHeight);

	const A_long linesL =
		output->extent_hint.bottom -
		output->extent_hint.top;

	if (PF_WORLD_IS_DEEP(output)) {

		ERR(
			suites.Iterate16Suite2()->iterate(
				in_data,
				0,
				linesL,
				&params[CORNERFLEX_INPUT]->u.ld,
				nullptr,
				&context,
				TrimFunc16,
				output)
		);

	}
	else {

		ERR(
			suites.Iterate8Suite2()->iterate(
				in_data,
				0,
				linesL,
				&params[CORNERFLEX_INPUT]->u.ld,
				nullptr,
				&context,
				TrimFunc8,
				output)
		);
	}

	return err;
}


extern "C" DllExport
PF_Err PluginDataEntryFunction2(
	PF_PluginDataPtr inPtr,
	PF_PluginDataCB2 inPluginDataCallBackPtr,
	SPBasicSuite* inSPBasicSuitePtr,
	const char* inHostName,
	const char* inHostVersion)
{
	PF_Err result = PF_Err_INVALID_CALLBACK;

	result = PF_REGISTER_EFFECT_EXT2(
		inPtr,
		inPluginDataCallBackPtr,
		"CornerFlex", // Name
		"BurgosInMotion CornerFlex", // Match Name
		"Burgos in Motion", // Category
		AE_RESERVED_INFO, // Reserved Info
		"EffectMain",	// Entry point
		"https://www.adobe.com");	// support URL

	return result;
}

static PF_Err
UpdateCornerFlexUI(
	PF_InData* in_data,
	PF_OutData* out_data,
	PF_ParamDef* params[])
{
	PF_Err err = PF_Err_NONE;

	const PF_Boolean linkTrim =
		params[CORNERFLEX_LINK_TRIM]->u.bd.value;

	PF_ParamDef trimDef;
	PF_ParamDef trimLeftDef;
	PF_ParamDef trimTopDef;
	PF_ParamDef trimRightDef;
	PF_ParamDef trimBottomDef;

	AEFX_CLR_STRUCT(trimDef);
	AEFX_CLR_STRUCT(trimLeftDef);
	AEFX_CLR_STRUCT(trimTopDef);
	AEFX_CLR_STRUCT(trimRightDef);
	AEFX_CLR_STRUCT(trimBottomDef);

	trimDef = *params[CORNERFLEX_TRIM];
	trimLeftDef = *params[CORNERFLEX_TRIM_LEFT];
	trimTopDef = *params[CORNERFLEX_TRIM_TOP];
	trimRightDef = *params[CORNERFLEX_TRIM_RIGHT];
	trimBottomDef = *params[CORNERFLEX_TRIM_BOTTOM];

	if (linkTrim) {

		trimDef.ui_flags &= ~PF_PUI_DISABLED;

		trimLeftDef.ui_flags |= PF_PUI_DISABLED;
		trimTopDef.ui_flags |= PF_PUI_DISABLED;
		trimRightDef.ui_flags |= PF_PUI_DISABLED;
		trimBottomDef.ui_flags |= PF_PUI_DISABLED;

	}
	else {

		trimDef.ui_flags |= PF_PUI_DISABLED;

		trimLeftDef.ui_flags &= ~PF_PUI_DISABLED;
		trimTopDef.ui_flags &= ~PF_PUI_DISABLED;
		trimRightDef.ui_flags &= ~PF_PUI_DISABLED;
		trimBottomDef.ui_flags &= ~PF_PUI_DISABLED;
	}

	AEGP_SuiteHandler suites(in_data->pica_basicP);

	ERR(suites.ParamUtilsSuite3()->PF_UpdateParamUI(
		in_data->effect_ref,
		CORNERFLEX_TRIM,
		&trimDef));

	ERR(suites.ParamUtilsSuite3()->PF_UpdateParamUI(
		in_data->effect_ref,
		CORNERFLEX_TRIM_LEFT,
		&trimLeftDef));

	ERR(suites.ParamUtilsSuite3()->PF_UpdateParamUI(
		in_data->effect_ref,
		CORNERFLEX_TRIM_TOP,
		&trimTopDef));

	ERR(suites.ParamUtilsSuite3()->PF_UpdateParamUI(
		in_data->effect_ref,
		CORNERFLEX_TRIM_RIGHT,
		&trimRightDef));

	ERR(suites.ParamUtilsSuite3()->PF_UpdateParamUI(
		in_data->effect_ref,
		CORNERFLEX_TRIM_BOTTOM,
		&trimBottomDef));

	return err;
}

PF_Err
EffectMain(
	PF_Cmd			cmd,
	PF_InData		*in_data,
	PF_OutData		*out_data,
	PF_ParamDef		*params[],
	PF_LayerDef		*output,
	void			*extra)
{
	PF_Err		err = PF_Err_NONE;
	
	try {
		switch (cmd) {
			case PF_Cmd_ABOUT:

				err = About(in_data,
							out_data,
							params,
							output);
				break;
				
			case PF_Cmd_GLOBAL_SETUP:

				err = GlobalSetup(	in_data,
									out_data,
									params,
									output);
				break;
				
			case PF_Cmd_PARAMS_SETUP:

				err = ParamsSetup(	in_data,
									out_data,
									params,
									output);
				break;

			case PF_Cmd_UPDATE_PARAMS_UI:

				err = UpdateCornerFlexUI(
					in_data,
					out_data,
					params);
				break;

			case PF_Cmd_USER_CHANGED_PARAM:

				err = UpdateCornerFlexUI(
					in_data,
					out_data,
					params);
				break;
				
			case PF_Cmd_RENDER:

				err = Render(	in_data,
								out_data,
								params,
								output);
				break;
		}
	}
	catch(PF_Err &thrown_err){
		err = thrown_err;
	}
	return err;
}

