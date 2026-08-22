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

	if (outsideBounds) {
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

	if (outsideBounds) {
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

	const CF_Rect transformedBounds =
		TransformLocalBoundsWithLayerTransform2D(
			localBounds,
			coordinateContext,
			layerTransformContext);

	if (!std::isfinite(transformedBounds.left) ||
		!std::isfinite(transformedBounds.top) ||
		!std::isfinite(transformedBounds.right) ||
		!std::isfinite(transformedBounds.bottom) ||
		transformedBounds.right < transformedBounds.left ||
		transformedBounds.bottom < transformedBounds.top) {
		return sourceData;
	}

	sourceData.bounds = transformedBounds;
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

static const A_long CF_MAX_TARGET_STREAM_DEPTH = 32;

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

	const CF_GeometryTargetLocation targetLocation =
		LocateGeometryTargetInAfterEffects(
			in_data,
			targetIdentity);

	const CF_RectanglePathProperties rectangleProperties =
		ReadRectanglePathPropertiesFromAfterEffects(
			in_data,
			targetIdentity,
			targetLocation);

	static_cast<void>(rectangleProperties);

	return rectangleSource;
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
		std::isfinite(rotationValue.one_d) &&
		std::fabs(rotationValue.one_d) <= 0.0001;

	if (!supportedTransform) {
		return transformContext;
	}

	transformContext.translationX =
		transformContext.positionX -
		(static_cast<PF_FpLong>(
			transformContext.compWidth) * 0.5) -
		(transformContext.anchorX *
			transformContext.scaleX);

	transformContext.translationY =
		transformContext.positionY -
		(static_cast<PF_FpLong>(
			transformContext.compHeight) * 0.5) -
		(transformContext.anchorY *
			transformContext.scaleY);

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
		return ResolveRectangleGeometry(
			request.rectangleSource);
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

	transform.a =
		layerTransformContext.scaleX;

	transform.d =
		layerTransformContext.scaleY;

	transform.tx =
		coordinateContext.originX +
		layerTransformContext.translationX;

	transform.ty =
		coordinateContext.originY +
		layerTransformContext.translationY;

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

	transformedRectangle.halfWidth =
		rectangle.halfWidth;

	transformedRectangle.halfHeight =
		rectangle.halfHeight;

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

	geometryContext.cornerRadii.topLeft = 0;
	geometryContext.cornerRadii.topRight = 0;
	geometryContext.cornerRadii.bottomRight = 0;
	geometryContext.cornerRadii.bottomLeft = 0;

	geometryContext.source =
		sourceData.source;

	geometryContext.primitiveType =
		sourceData.primitiveType;

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

	const CF_RectangleSourceData convertedRectangleSource =
		ConvertRectangleGeometrySnapshotToSourceData(
			rectangleSnapshot,
			coordinateContext,
			layerTransformContext);

	const CF_GeometryTargetState storedTargetState =
		ReadGeometryTargetState(params);

	const CF_GeometryTargetIdentity targetIdentity =
		GetActiveGeometryTargetIdentity(
			storedTargetState);

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

